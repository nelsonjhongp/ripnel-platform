"use client";

import { useRouter } from "next/navigation";
import FormField from "./ui/FormField";
import CustomButton from "./ui/CustomButton";

export default function LoginRipnel() {
  const router = useRouter();

  const handleSubmit = (event) => {
    event.preventDefault();
    router.push("/sidebar");
  };

    return (
      <div className="w-3xs mx-auto flex flex-col items-center justify-center min-h-screen py-2">
      <img
        src="/login_user.png"
        alt="Vercel Logo"
        className="h-16 w-auto"
      />

      <h2 className="text-4xl text-center font-bold mt-4">Inicio de sesión</h2>

      <form className="mt-4" onSubmit={handleSubmit}>
        <FormField
          label="Correo electrónico"
          type="email"
          id="email"
          placeholder="Ingrese su correo electrónico"
          required
        />

        <FormField
          label="Contraseña"
          type="password"
          id="password"
          placeholder="Ingrese su contraseña"
          required
        />

        <FormField
          label="Sede"
          type="select"
          id="sede"
          required
          defaultValue=""
        >
          <option value="">Selecciona una sede</option>
          <option value="Almacen">Almacén</option>
          <option value="Tienda 1">Tienda 1</option>
          <option value="Tienda 2">Tienda 2</option>
        </FormField>

        <CustomButton type="submit">
          Iniciar sesión
        </CustomButton>

      </form>
    </div>
  )
}