import { LoadingPage } from "@/components/feedback/status-page";

export default function ProtectedLoading() {
  return <LoadingPage title="Cargando módulo" description="Estamos preparando datos, permisos y contexto operativo." />;
}