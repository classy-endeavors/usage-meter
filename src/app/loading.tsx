import { Loader } from "@/components/loader";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center">
      <Loader label="Loading usage…" />
    </div>
  );
}
