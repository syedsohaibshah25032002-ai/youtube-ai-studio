export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startYoutubeUploadQueueWorker } =
      await import("@/features/youtube-upload/queue-worker");
    startYoutubeUploadQueueWorker();
  }
}
