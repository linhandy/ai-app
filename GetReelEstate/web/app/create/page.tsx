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
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-gray-950/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {process.env.NEXT_PUBLIC_PLATFORM_URL && (
            <a href={process.env.NEXT_PUBLIC_PLATFORM_URL} className="text-xs text-gray-600 hover:text-gray-400 transition-colors hidden sm:block shrink-0">
              ← 平台
            </a>
          )}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-gray-900 text-xs">G</div>
            <span className="font-semibold text-sm sm:text-base">GetReelEstate</span>
          </Link>
          <span className="text-gray-600 hidden sm:block">/</span>
          <span className="text-gray-400 text-xs sm:text-sm hidden sm:block truncate">Create Reel</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && (
            <span className="text-xs text-gray-500 hidden md:block truncate max-w-[160px]">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          )}
          <UserButton />
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Create Your Reel</h1>
          <p className="text-gray-400 text-sm">Paste a listing URL or upload photos — free</p>
        </div>

        <VideoGenerator defaultVideoId={videoId} />
      </div>
    </div>
  );
}
