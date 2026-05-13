import PostsaleDetailPage from "@/components/modules/postsales/postsale-detail-page"

type PostsaleDetailRouteProps = {
  params: Promise<{ saleId: string }>
}

export default function Page(props: PostsaleDetailRouteProps) {
  return <PostsaleDetailPage {...props} />
}
