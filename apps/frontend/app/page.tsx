import { Suspense } from "react";
import LoginRipnel from "@/components/login";

export default function Home() {
  return (
    <Suspense>
      <LoginRipnel />
    </Suspense>
  );
}
