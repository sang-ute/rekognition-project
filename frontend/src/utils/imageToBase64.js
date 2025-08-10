// Convert file -> base64 (bỏ prefix "data:image/jpeg;base64,")
export function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(",")[1]; // bỏ phần đầu
      resolve(base64String);
    };
    reader.onerror = reject;
  });
}
