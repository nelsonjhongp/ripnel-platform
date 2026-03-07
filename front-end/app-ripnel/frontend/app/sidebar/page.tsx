import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function SidebarPage() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-indigo-100 bg-white px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/sidebar">Inicio</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Panel del usuario</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <section className="flex flex-1 flex-col gap-4 bg-linear-to-br from-indigo-50 via-white to-slate-50 p-6">
            <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
                Ubicacion actual
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Panel del usuario
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Este breadcrumb es estatico y de ejemplo. Mas adelante aqui puedes reflejar la seccion real en la que navega el usuario dentro de RRipnel.
              </p>
            </div>
          </section>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}