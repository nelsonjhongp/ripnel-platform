import { PermissionGuard } from "@/components/auth/PermissionGuard"
import PostsalePage from "@/components/modules/postsales/postsales-page"

export default function Page() {
  return (
    <PermissionGuard permission="sales.postsale.view">
      <PostsalePage />
    </PermissionGuard>
  )
}