import { PermissionGuard } from "@/components/auth/PermissionGuard"
import PostsaleDetailPage from "@/components/modules/postsales/postsale-detail-page"

type PostsaleDetailRouteProps = {
  params: Promise<{ saleId: string }>
}

export default function Page(props: PostsaleDetailRouteProps) {
  return (
    <PermissionGuard permission="sales.postsale.view">
      <PostsaleDetailPage {...props} />
    </PermissionGuard>
  )
}