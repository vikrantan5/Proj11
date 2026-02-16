const reportErrorToRemote = async ({ error }) => {
  if (
    !process.env.EXPO_PUBLIC_LOGS_ENDPOINT ||
    !process.env.EXPO_PUBLIC_PROJECT_GROUP_ID ||
    !process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY
  ) {
    // Silently skip remote logging if environment variables are not configured
    // This is expected for non-create.xyz deployments
    return { success: false };
  }
  try {
    // Dynamic import for ES module
    const { serializeError } = await import('serialize-error');
    
    await fetch(process.env.EXPO_PUBLIC_LOGS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY}`,
      },
      body: JSON.stringify({
        projectGroupId: process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
        logs: [
          {
            message: JSON.stringify(serializeError(error)),
            timestamp: new Date().toISOString(),
            level: 'error',
          },
        ],
      }),
    });
  } catch (fetchError) {
    return { success: false, error: fetchError };
  }
  return { success: true };
};

module.exports = { reportErrorToRemote };
