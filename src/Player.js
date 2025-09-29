// ✅ BENAR - Tidak ada function dalam loop
for (let i = 0; i < episodesWithUrl.length; i++) {
  // Check cancellation
  if (isCancelledRef.current) break;
  
  const episode = episodesWithUrl[i];
  
  // Update progress
  setProgressModal(prev => ({
    ...prev,
    current: i + 1,
    currentEpisode: episode
  }));
  
  // Process episode...
  
  // Update counts
  setProgressModal(prev => ({
    ...prev,
    successCount: prev.successCount + (success ? 1 : 0),
    failedCount: prev.failedCount + (success ? 0 : 1)
  }));
}