export const MAX_LAB_IMAGE_BYTES = Math.floor(4.5 * 1024 * 1024);

export function validateLabImageSize(size: number | undefined): boolean {
  return size == null || size <= MAX_LAB_IMAGE_BYTES;
}

export function getLocalFileSize(
  filePath: string
): Promise<number | undefined> {
  return new Promise((resolve) => {
    uni.getFileInfo({
      filePath,
      success: (res) => resolve(res.size),
      fail: () => resolve(undefined),
    });
  });
}
