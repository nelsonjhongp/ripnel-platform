const { GoogleGenerativeAI } = require('@google/generative-ai');
const { z } = require('zod');
const { env } = require('../../config/env');
const { AppError } = require('../../shared/errors');
const { query } = require('../../shared/db');
const repo = require('./chatbot.repo');

const CHAT_MODEL = 'models/gemini-2.5-flash';
const EMBED_MODEL = 'models/text-embedding-004';
const SIMILARITY_THRESHOLD = 0.85;

let genAIInstance = null;
function getGenAI() {
  if (!genAIInstance) {
    if (!env.geminiApiKey) {
      throw new AppError('GEMINI_API_KEY no configurada', 500, { code: 'CONFIG_ERROR' });
    }
    genAIInstance = new GoogleGenerativeAI(env.geminiApiKey);
  }
  return genAIInstance;
}

const dateRangeSchema = z.object({
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
});

const productSearchSchema = z.object({
  query: z.string().min(1),
});

const customerSearchSchema = z.object({
  query: z.string().min(1),
});

function normalizeQuestion(text) {
  return text
    .toLowerCase()
    .replace(/[¿?¡!,;.:()\[\]{}"'\/\\@#$%^&*<>~`\n\r]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashQuestion(text) {
  let hash = 0;
  const normalized = normalizeQuestion(text);
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

const TOOLS = [
  {
    name: 'get_today_metrics',
    description: 'Obtiene un resumen rapido del dia actual: ventas del dia, alertas de inventario, transferencias pendientes y estado de caja.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_sales_summary',
    description: 'Obtiene resumen de ventas de una fecha especifica. Si no se especifica fecha, usa la fecha actual.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD (opcional, default hoy)' },
      },
    },
  },
  {
    name: 'get_stock',
    description: 'Obtiene el stock total de un producto por su style_id (UUID del producto)',
    parameters: {
      type: 'object',
      properties: {
        style_id: { type: 'string', description: 'ID del estilo de producto (formato UUID)' },
      },
      required: ['style_id'],
    },
  },
  {
    name: 'get_inventory_alerts',
    description: 'Obtiene alertas de inventario: conteo de productos con stock cero y bajo stock (menor o igual a 3 unidades), mas los 5 productos mas criticos.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_pending_transfers',
    description: 'Obtiene conteo de transferencias de stock pendientes por recibir.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_cash_status',
    description: 'Obtiene el estado actual de la caja del dia para la sede del usuario.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'obtener_top_productos',
    description: 'Obtiene el top 10 de productos mas vendidos en un rango de fechas. Si no se especifican fechas, usa los ultimos 30 dias.',
    parameters: {
      type: 'object',
      properties: {
        fecha_inicio: { type: 'string', description: 'Fecha inicial en formato YYYY-MM-DD (opcional, default ultimos 30 dias)' },
        fecha_fin: { type: 'string', description: 'Fecha final en formato YYYY-MM-DD (opcional, default hoy)' },
      },
    },
  },
  {
    name: 'search_products_by_name',
    description: 'Busca productos (estilos) por nombre o codigo. Devuelve hasta 10 resultados.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto de busqueda: nombre del producto o codigo de estilo' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_customers_by_name',
    description: 'Busca clientes por nombre, documento o correo. Devuelve hasta 10 resultados.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto de busqueda: nombre, documento o email del cliente' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_latest_sales',
    description: 'Obtiene las ultimas ventas realizadas. Por defecto devuelve las ultimas 5.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_user_session',
    description: 'Obtiene informacion del usuario actual: nombre, rol y sede por defecto.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'calculate_percentage',
    description: 'Calcula el porcentaje que representa una parte respecto a un total.',
    parameters: {
      type: 'object',
      properties: {
        part: { type: 'number', description: 'Valor de la parte' },
        total: { type: 'number', description: 'Valor del total' },
      },
      required: ['part', 'total'],
    },
  },
  {
    name: 'calculate_discount',
    description: 'Calcula el precio final despues de aplicar un descuento porcentual.',
    parameters: {
      type: 'object',
      properties: {
        original_price: { type: 'number', description: 'Precio original del producto' },
        discount_percent: { type: 'number', description: 'Porcentaje de descuento a aplicar (0-100)' },
      },
      required: ['original_price', 'discount_percent'],
    },
  },
  {
    name: 'get_system_info',
    description: 'Obtiene informacion general del sistema RIPNEL: modulos disponibles y version.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_module_help',
    description: 'Obtiene ayuda detallada sobre como usar un modulo especifico del sistema.',
    parameters: {
      type: 'object',
      properties: {
        module_name: { type: 'string', description: 'Nombre del modulo (ej: ventas, inventario, caja, productos, clientes, dashboard, administracion, catalogos, precios, transferencias, postventa, bi)' },
      },
      required: ['module_name'],
    },
  },
  {
    name: 'calculate',
    description: 'Realiza operaciones aritmeticas basicas: suma, resta, multiplicacion, division.',
    parameters: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'Primer numero' },
        b: { type: 'number', description: 'Segundo numero' },
        operation: { type: 'string', enum: ['sumar', 'restar', 'multiplicar', 'dividir'], description: 'Operacion a realizar' },
      },
      required: ['a', 'b', 'operation'],
    },
  },
  {
    name: 'get_sales_by_date_range',
    description: 'Obtiene resumen de ventas entre dos fechas: total ventas, ingresos y promedio por dia.',
    parameters: {
      type: 'object',
      properties: {
        fecha_inicio: { type: 'string', description: 'Fecha inicial en formato YYYY-MM-DD' },
        fecha_fin: { type: 'string', description: 'Fecha final en formato YYYY-MM-DD (opcional, default hoy)' },
      },
      required: ['fecha_inicio'],
    },
  },
];

const SYSTEM_PROMPT = `Eres un asistente experto en el sistema RIPNEL, un ERP de inventario, ventas y logistica.

REGLAS ESTRICTAS:
- Responde SIEMPRE en espanol, de forma clara y concisa.
- Si el usuario pregunta por datos del sistema (ventas, stock, clientes, etc.), USA LAS HERRAMIENTAS DISPONIBLES. No intentes responder de memoria.
- NUNCA inventes datos, numeros, fechas, codigos o precios. Si no puedes obtener la informacion con las herramientas, responde: "No tengo acceso a esa informacion en este momento."
- Si te preguntan algo que no sabes o que esta fuera del alcance del sistema RIPNEL, responde honestamente: "No lo se" o "Esa informacion no esta disponible en el sistema."
- NO adivines ni generes numeros aleatorios. Es preferible decir "No lo se" a dar una respuesta incorrecta.
- Para preguntas generales sobre como usar el sistema, responde con base en tu conocimiento de los modulos.
- Manten el contexto de la conversacion para respuestas coherentes.
- NO uses formato Markdown. No uses asteriscos, guiones ni numerales para listas o enfasis. Para listas usa numeros simples con punto.
- Si el usuario pide top productos sin especificar fechas, usa obtener_top_productos sin enviar fechas, el sistema usara los ultimos 30 dias por defecto.
- Si te preguntan por el estado general del sistema, puedes usar get_today_metrics para obtener un resumen rapido.
- Puedes ayudar con navegacion del sistema y ayuda de modulos usando get_module_help o get_system_info.
- Puedes realizar calculos de precios y descuentos usando calculate_discount y calculate_percentage.
- Para operaciones aritmeticas basicas (sumar, restar, multiplicar, dividir) usa calculate.
- Si el usuario pide ventas de un periodo, usa get_sales_by_date_range.
- Si el usuario pregunta algo como "cuantos productos hay" o "busca un producto", usa search_products_by_name.
- Si el usuario pregunta por un cliente, usa search_customers_by_name.
- IMPORTANTE: Si no tienes una herramienta para responder la pregunta, NO INVENTES. Di "No tengo una herramienta para consultar eso."`;

async function generateEmbedding(text) {
  if (!env.geminiApiKey) return null;
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.warn('Error generando embedding semantico:', err.message);
    return null;
  }
}

async function processPrompt(input) {
  const { userId, conversationId, prompt } = input;

  const convId = conversationId || null;
  let activeConversationId = convId;

  if (!activeConversationId) {
    const conv = await repo.createConversation(userId, prompt.slice(0, 80));
    activeConversationId = conv.conversation_id;
  } else {
    const existing = await repo.findConversationById(activeConversationId);
    if (!existing || !existing.active) {
      throw new AppError('Conversacion no encontrada o inactiva', 404);
    }
    if (existing.user_id !== userId) {
      throw new AppError('No autorizado para esta conversacion', 403);
    }
  }

  const questionHash = hashQuestion(prompt);
  const cachedResponse = await repo.findResponseCache(questionHash);
  if (cachedResponse) {
    await repo.insertMessage(activeConversationId, 'user', prompt, null);
    const assistantMsg = await repo.insertMessage(
      activeConversationId,
      'assistant',
      cachedResponse.response_text,
      { cached: true, cache_type: 'text' }
    );
    await repo.touchResponseCache(cachedResponse.id);
    await repo.updateConversationTimestamp(activeConversationId);

    return {
      conversation_id: activeConversationId,
      response: cachedResponse.response_text,
      cached: true,
      message_id: assistantMsg.message_id,
    };
  }

  const history = await repo.findMessagesByConversation(activeConversationId, 30);

  const embedding = await generateEmbedding(prompt);

  if (embedding) {
    try {
      const semanticCached = await repo.findSemanticCache(embedding, SIMILARITY_THRESHOLD);
      if (semanticCached) {
        await repo.insertMessage(activeConversationId, 'user', prompt, null);
        const assistantMsg = await repo.insertMessage(
          activeConversationId,
          'assistant',
          semanticCached.response_text,
          { cached: true, cache_type: 'semantic', cache_id: semanticCached.cache_id }
        );
        await repo.touchCacheAccess(semanticCached.cache_id);
        await repo.updateConversationTimestamp(activeConversationId);

        return {
          conversation_id: activeConversationId,
          response: semanticCached.response_text,
          cached: true,
          message_id: assistantMsg.message_id,
        };
      }
    } catch (err) {
      console.warn('Error consultando cache semantica:', err.message);
    }
  }

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: CHAT_MODEL, tools: [{ functionDeclarations: TOOLS }] });

  const chatHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: chatHistory,
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
  });

  let responseText = '';
  let functionCallCount = 0;
  const MAX_FUNCTION_CALLS = 5;

  try {
    let result = await chat.sendMessage(prompt);

    while (functionCallCount < MAX_FUNCTION_CALLS) {
      const candidate = result.response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      if (!part || !part.functionCall) {
        responseText = result.response.text();
        break;
      }

      const fc = part.functionCall;
      const funcResult = await executeFunctionCall(fc.name, fc.args, userId);
      console.log('[chatbot] function call:', fc.name, JSON.stringify(fc.args), typeof funcResult === 'object' ? 'ok' : funcResult);

      const funcResultObj = {
        functionResponse: {
          name: fc.name,
          response: { result: funcResult },
        },
      };

      result = await chat.sendMessage([funcResultObj]);
      functionCallCount++;
    }

    if (!responseText) {
      responseText = result.response.text();
    }
  } catch (err) {
    if (err.status === 429 || err.statusCode === 429 || (err.message && err.message.includes('429'))) {
      throw new AppError('El asistente esta procesando muchas solicitudes. Intenta en un minuto.', 429, { code: 'RATE_LIMITED' });
    }
    throw err;
  }

  await repo.insertMessage(activeConversationId, 'user', prompt, null);
  const assistantMsg = await repo.insertMessage(
    activeConversationId,
    'assistant',
    responseText,
    null
  );
  await repo.updateConversationTimestamp(activeConversationId);

  if (responseText.length >= 10 && responseText.length < 5000) {
    const normalized = normalizeQuestion(prompt);
    repo.upsertResponseCache(questionHash, normalized, responseText).catch(() => {});
  }

  if (embedding && responseText.length < 5000) {
    repo.insertSemanticCache(prompt, embedding, responseText).catch(() => {});
  }

  return {
    conversation_id: activeConversationId,
    response: responseText,
    cached: false,
    message_id: assistantMsg.message_id,
  };
}

async function executeFunctionCall(name, args, userId) {
  switch (name) {
    case 'get_today_metrics': {
      const today = new Date().toISOString().slice(0, 10);
      const [sales, alerts, transfers, cashStatus] = await Promise.all([
        query(
          `SELECT COUNT(*)::INT AS sale_count,
                  COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS total_amount
           FROM sales
           WHERE DATE(created_at AT TIME ZONE 'America/Lima') = $1`,
          [today]
        ),
        query(
          `SELECT COUNT(*) FILTER (WHERE i.qty = 0)::INT AS zero_stock,
                  COUNT(*) FILTER (WHERE i.qty > 0 AND i.qty <= 3)::INT AS low_stock
           FROM inventory i
           JOIN product_variants pv ON pv.variant_id = i.variant_id`
        ),
        query(
          `SELECT COUNT(*)::INT AS pending_count
           FROM stock_transfers
           WHERE status = 'shipped'`
        ),
        query(
          `SELECT status, opening_amount, closed_at IS NOT NULL AS is_closed
           FROM cash_closings cc
           WHERE cc.location_id IN (
             SELECT ul.location_id FROM user_locations ul WHERE ul.user_id = $1 AND ul.is_default = TRUE
           )
           AND DATE(cc.opened_at AT TIME ZONE 'America/Lima') = $2
           ORDER BY cc.opened_at DESC
           LIMIT 1`,
          [userId, today]
        ),
      ]);
      return {
        date: today,
        sales: sales.rows[0] || { sale_count: 0, total_amount: 0 },
        inventory_alerts: alerts.rows[0] || { zero_stock: 0, low_stock: 0 },
        pending_transfers: transfers.rows[0] || { pending_count: 0 },
        cash_status: cashStatus.rows[0] || { status: 'no_open' },
      };
    }

    case 'get_sales_summary': {
      const date = args.date || new Date().toISOString().slice(0, 10);
      const result = await query(
        `SELECT COUNT(*)::INT AS sale_count,
                COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS total_amount,
                COUNT(*) FILTER (WHERE status = 'confirmed')::INT AS confirmed_count
         FROM sales
         WHERE DATE(created_at AT TIME ZONE 'America/Lima') = $1`,
        [date]
      );
      return result.rows[0] || { sale_count: 0, total_amount: 0, confirmed_count: 0 };
    }

    case 'get_stock': {
      if (!args.style_id) {
        return { error: 'style_id es requerido' };
      }
      const result = await query(
        `SELECT ps.style_id, ps.style_code AS code, ps.name,
                COALESCE(SUM(i.qty), 0)::INT AS total_stock,
                COUNT(DISTINCT i.variant_id)::INT AS variants_with_stock,
                COUNT(DISTINCT i.location_id)::INT AS locations_count
         FROM product_styles ps
         LEFT JOIN product_variants pv ON pv.style_id = ps.style_id
         LEFT JOIN inventory i ON i.variant_id = pv.variant_id AND i.qty > 0
         WHERE ps.style_id = $1
         GROUP BY ps.style_id, ps.code, ps.name`,
        [args.style_id]
      );
      return result.rows[0] || { total_stock: 0, variants_with_stock: 0, locations_count: 0 };
    }

    case 'get_inventory_alerts': {
      const result = await query(
        `SELECT
           COUNT(*) FILTER (WHERE i.qty = 0)::INT AS zero_stock_count,
           COUNT(*) FILTER (WHERE i.qty > 0 AND i.qty <= 3)::INT AS low_stock_count
         FROM inventory i
         JOIN product_variants pv ON pv.variant_id = i.variant_id`
      );
      const critical = await query(
        `SELECT pv.variant_id, ps.name AS style_name, pv.sku, i.qty
         FROM inventory i
         JOIN product_variants pv ON pv.variant_id = i.variant_id
         JOIN product_styles ps ON ps.style_id = pv.style_id
         WHERE i.qty <= 3
         ORDER BY i.qty ASC
         LIMIT 5`
      );
      return {
        ...result.rows[0],
        critical_variants: critical.rows,
      };
    }

    case 'get_pending_transfers': {
      const result = await query(
        `SELECT COUNT(*)::INT AS pending_count
         FROM stock_transfers
         WHERE status = 'shipped'`
      );
      return result.rows[0] || { pending_count: 0 };
    }

    case 'get_cash_status': {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const result = await query(
        `SELECT cc.closing_id, cc.status, cc.opened_at, cc.closed_at,
                cc.opening_amount, cc.closing_amount,
                l.name AS location_name
         FROM cash_closings cc
         JOIN locations l ON l.location_id = cc.location_id
         WHERE cc.location_id IN (
           SELECT ul.location_id FROM user_locations ul WHERE ul.user_id = $1 AND ul.is_default = TRUE
         )
         AND DATE(cc.opened_at AT TIME ZONE 'America/Lima') = $2
         ORDER BY cc.opened_at DESC
         LIMIT 1`,
        [userId, today]
      );
      return result.rows[0] || { status: 'no_open', message: 'No se abrio caja hoy' };
    }

    case 'obtener_top_productos': {
      const parsed = dateRangeSchema.safeParse(args);
      if (!parsed.success) {
        return { error: 'Parametros invalidos' };
      }
      const fechaFin = parsed.data.fecha_fin || new Date().toISOString().slice(0, 10);
      const fechaInicio = parsed.data.fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const result = await query(
        `SELECT ps.style_id, ps.style_code AS code, ps.name,
                COUNT(DISTINCT s.sale_id)::INT AS sale_count,
                SUM(sd.quantity)::INT AS total_units,
                COALESCE(SUM(sd.line_total), 0)::NUMERIC(12,2) AS total_revenue
         FROM product_styles ps
         JOIN product_variants pv ON pv.style_id = ps.style_id
         JOIN sales_details sd ON sd.variant_id = pv.variant_id
         JOIN sales s ON s.sale_id = sd.sale_id
         WHERE s.status = 'confirmed'
           AND DATE(s.created_at AT TIME ZONE 'America/Lima') >= $1
           AND DATE(s.created_at AT TIME ZONE 'America/Lima') <= $2
         GROUP BY ps.style_id, ps.style_code, ps.name
         ORDER BY total_units DESC
         LIMIT 10`,
        [fechaInicio, fechaFin]
      );
      return result.rows;
    }

    case 'search_products_by_name': {
      const parsed = productSearchSchema.safeParse(args);
      if (!parsed.success) return { error: 'Texto de busqueda requerido' };
      const searchTerm = `%${parsed.data.query}%`;
      const result = await query(
        `SELECT style_id, style_code, name, category,
                (SELECT COALESCE(SUM(i.qty), 0)::INT
                 FROM product_variants pv2
                 LEFT JOIN inventory i ON i.variant_id = pv2.variant_id
                 WHERE pv2.style_id = ps.style_id) AS total_stock
         FROM product_styles ps
         WHERE name ILIKE $1 OR style_code ILIKE $1
         ORDER BY name ASC
         LIMIT 10`,
        [searchTerm]
      );
      return result.rows;
    }

    case 'search_customers_by_name': {
      const parsed = customerSearchSchema.safeParse(args);
      if (!parsed.success) return { error: 'Texto de busqueda requerido' };
      const searchTerm = `%${parsed.data.query}%`;
      const result = await query(
        `SELECT customer_id, full_name, document_type, document_number, email, phone,
                (SELECT COUNT(*)::INT FROM sales s WHERE s.customer_id = c.customer_id) AS total_sales
         FROM customers c
         WHERE full_name ILIKE $1 OR document_number ILIKE $1 OR email ILIKE $1
         ORDER BY full_name ASC
         LIMIT 10`,
        [searchTerm]
      );
      return result.rows;
    }

    case 'get_latest_sales': {
      const result = await query(
        `SELECT s.sale_id, s.document_type, s.document_series, s.document_number,
                s.total_amount, s.status, s.created_at,
                c.full_name AS customer_name,
                COALESCE(s.total_amount, 0)::NUMERIC(12,2) AS amount
         FROM sales s
         LEFT JOIN customers c ON c.customer_id = s.customer_id
         ORDER BY s.created_at DESC
         LIMIT 5`
      );
      return result.rows;
    }

    case 'get_user_session': {
      const result = await query(
        `SELECT u.user_id, u.full_name, u.username, r.name AS role_name,
                l.name AS default_location, l.location_id
         FROM users u
         JOIN roles r ON r.role_id = u.role_id
         LEFT JOIN user_locations ul ON ul.user_id = u.user_id AND ul.is_default = TRUE
         LEFT JOIN locations l ON l.location_id = ul.location_id
         WHERE u.user_id = $1`,
        [userId]
      );
      return result.rows[0] || { error: 'Usuario no encontrado' };
    }

    case 'calculate_percentage': {
      const { part, total } = args;
      if (!total || total === 0) {
        return { part, total, percentage: 0, error: 'El total no puede ser cero' };
      }
      return {
        part,
        total,
        percentage: Math.round((part / total) * 10000) / 100,
      };
    }

    case 'calculate_discount': {
      const { original_price, discount_percent } = args;
      const discount = (original_price * discount_percent) / 100;
      const finalPrice = original_price - discount;
      return {
        original_price,
        discount_percent,
        discount_amount: Math.round(discount * 100) / 100,
        final_price: Math.round(finalPrice * 100) / 100,
        savings: Math.round(discount * 100) / 100,
      };
    }

    case 'get_system_info': {
      return {
        name: 'RIPNEL ERP',
        version: 'MVP v2.0',
        modules: [
          { name: 'Inicio', description: 'Resumen general del sistema con metricas rapidas' },
          { name: 'Dashboard', description: 'Analitica y graficos de rendimiento' },
          { name: 'Administracion', description: 'Gestion de usuarios, roles y ubicaciones' },
          { name: 'Catalogos', description: 'Gestion de tallas, colores, tipos de prenda y telas' },
          { name: 'Clientes', description: 'Registro e historial de clientes' },
          { name: 'Productos', description: 'Creacion y gestion de estilos y variantes' },
          { name: 'Precios', description: 'Configuracion de precios y reglas de pricing' },
          { name: 'Inventario', description: 'Control de stock por ubicacion y kardex' },
          { name: 'Transferencias', description: 'Traslado de stock entre ubicaciones' },
          { name: 'Ventas', description: 'Punto de venta con pagos mixtos y descuentos' },
          { name: 'Historial de Ventas', description: 'Consulta de ventas realizadas' },
          { name: 'Postventa', description: 'Cambios y anulaciones de ventas' },
          { name: 'Caja', description: 'Apertura, cierre e historial de caja' },
          { name: 'BI', description: 'Business intelligence con graficos nativos' },
        ],
      };
    }

    case 'get_module_help': {
      const helpMap = {
        inicio: 'El modulo Inicio muestra un resumen general del sistema: ventas del dia, alertas de stock, transferencias pendientes y estado de caja. Es la pantalla por defecto al ingresar.',
        dashboard: 'El modulo Dashboard presenta graficos y analitica de rendimiento de ventas, productos top y tendencias.',
        administracion: 'El modulo Administracion permite gestionar usuarios, roles y ubicaciones. Puedes crear, editar y desactivar usuarios, asignar roles y configurar ubicaciones.',
        catalogos: 'El modulo Catalogos permite administrar tallas, colores, tipos de prenda y telas usados en la ficha de productos.',
        clientes: 'El modulo Clientes permite registrar nuevos clientes, ver su historial de compras y mantener sus datos de contacto actualizados.',
        productos: 'El modulo Productos permite crear estilos, asignar tallas y colores, generar variantes y configurar precios base.',
        precios: 'El modulo Precios permite definir precios por talla y reglas de pricing automaticas como margen sobre costo.',
        inventario: 'El modulo Inventario muestra el stock actual por ubicacion, permite realizar ajustes y consultar el kardex de movimientos.',
        transferencias: 'El modulo Transferencias permite crear solicitudes de traslado de stock entre ubicaciones y recibirlas cuando lleguen.',
        ventas: 'El modulo Ventas es el punto de venta. Permite seleccionar cliente, buscar variantes por codigo, aplicar descuentos, elegir tipo de comprobante y registrar pagos mixtos (efectivo, tarjeta, yape).',
        'historial de ventas': 'El modulo Historial de Ventas lista todas las ventas realizadas con opcion de ver detalle, descargar recibo y reimprimir comprobantes.',
        postventa: 'El modulo Postventa permite realizar cambios de productos y anulaciones de ventas confirmadas.',
        caja: 'El modulo Caja permite abrir y cerrar caja por ubicacion, registrar movimientos y consultar el historial de arqueos.',
        bi: 'El modulo BI presenta business intelligence con graficos nativos para analisis de datos comerciales.',
      };
      const key = (args.module_name || '').toLowerCase().trim();
      if (helpMap[key]) return { module: args.module_name, help: helpMap[key] };
      return { module: args.module_name, help: null, error: 'Modulo no encontrado. Los modulos disponibles son: inicio, dashboard, administracion, catalogos, clientes, productos, precios, inventario, transferencias, ventas, historial de ventas, postventa, caja, bi.' };
    }

    case 'calculate': {
      const { a, b, operation } = args;
      const ops = {
        sumar: (x, y) => ({ result: x + y, label: `${x} + ${y} = ${x + y}` }),
        restar: (x, y) => ({ result: x - y, label: `${x} - ${y} = ${x - y}` }),
        multiplicar: (x, y) => ({ result: x * y, label: `${x} * ${y} = ${x * y}` }),
        dividir: (x, y) => {
          if (y === 0) return { error: 'No se puede dividir por cero' };
          return { result: x / y, label: `${x} / ${y} = ${Math.round((x / y) * 100) / 100}` };
        },
      };
      const opFn = ops[operation];
      if (!opFn) return { error: `Operacion no soportada: ${operation}` };
      return opFn(a, b);
    }

    case 'get_sales_by_date_range': {
      const fechaInicio = args.fecha_inicio || null;
      const fechaFin = args.fecha_fin || new Date().toISOString().slice(0, 10);
      if (!fechaInicio) return { error: 'Fecha inicial requerida' };
      const result = await query(
        `SELECT COUNT(*)::INT AS sale_count,
                COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS total_revenue,
                COUNT(*) FILTER (WHERE status = 'confirmed')::INT AS confirmed_count,
                COALESCE(AVG(total_amount), 0)::NUMERIC(12,2) AS avg_per_day
         FROM sales
         WHERE DATE(created_at AT TIME ZONE 'America/Lima') >= $1
           AND DATE(created_at AT TIME ZONE 'America/Lima') <= $2`,
        [fechaInicio, fechaFin]
      );
      return { ...result.rows[0], date_from: fechaInicio, date_to: fechaFin };
    }

    default:
      return { error: `Funcion desconocida: ${name}` };
  }
}

async function listConversations(userId) {
  return repo.findConversationsByUser(userId);
}

async function getConversationMessages(conversationId, userId) {
  const conv = await repo.findConversationById(conversationId);
  if (!conv) {
    throw new AppError('Conversacion no encontrada', 404);
  }
  if (conv.user_id !== userId) {
    throw new AppError('No autorizado para esta conversacion', 403);
  }
  return repo.findMessagesByConversation(conversationId);
}

async function deleteConversation(conversationId, userId) {
  const conv = await repo.findConversationById(conversationId);
  if (!conv) {
    throw new AppError('Conversacion no encontrada', 404);
  }
  if (conv.user_id !== userId) {
    throw new AppError('No autorizado para esta conversacion', 403);
  }
  await repo.deactivateConversation(conversationId);
}

module.exports = {
  processPrompt,
  listConversations,
  getConversationMessages,
  deleteConversation,
};
