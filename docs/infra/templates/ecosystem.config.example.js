// Ejemplo de ecosystem PM2 para RIPNEL staging.
//
// Uso:
//   1. Copiar a ecosystem.config.js en el Droplet (fuera de este repo,
//      o en el repo clonado ahi si se prefiere, pero nunca con valores
//      reales de env embebidos aqui).
//   2. Las variables reales (DATABASE_URL, JWT_SECRET, etc.) se cargan
//      desde el .env del sistema (dotenv, ya usado por
//      apps/backend/src/config/env.js) o desde un archivo externo no
//      versionado — este ecosystem file NO las define por valor.
//   3. Ajustar el placeholder de "cwd" a la ruta real del repo clonado
//      en el Droplet.
//   4. pm2 start ecosystem.config.js
//      pm2 save
//      pm2 startup   (una sola vez, para persistir tras reinicios)

module.exports = {
  apps: [
    {
      name: "ripnel-backend-staging",
      script: "apps/backend/src/server.js",
      cwd: "/home/ripnel/ripnel-platform",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      // Las variables de entorno reales viven en apps/backend/.env
      // (dotenv) o en el entorno del sistema — no se definen aqui.
    },
    {
      name: "ripnel-frontend-staging",
      script: "npm",
      args: "run start --workspace @ripnel/frontend",
      cwd: "/home/ripnel/ripnel-platform",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      // NEXT_PUBLIC_API_BASE_URL se hornea en build-time (next build),
      // no en runtime — ver docs/infra/templates/.env.staging.frontend.example.
    },
  ],
};
