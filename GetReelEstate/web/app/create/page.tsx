import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import VideoGenerator from '@/components/VideoGenerator';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{ video_id?: string }>;
}

export default async function CreatePage({ searchParams }: Props) {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const params = await searchParams;
  const videoId = params.video_id;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {process.env.NEXT_PUBLIC_PLATFORM_URL && (
            <a href={process.env.NEXT_PUBLIC_PLATFORM_URL} className="text-xs text-gray-600 hover:text-gray-400 transition-colors hidden sm:block">
              ← 平台
            </a>
          )}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-gray-900 text-xs">G</div>
            <span className="font-semibold">GetReelEstate</span>
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400 text-sm">Create Reel</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-xs text-gray-500 hidden sm:block">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          )}
          <UserButton />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Create Your Reel</h1>
          <p className="text-gray-400 text-sm">Paste a listing URL or upload photos to get started — free</p>
        </div>

        <VideoGenerator defaultVideoId={videoId} />
      </div>
    </div>
  );
}
