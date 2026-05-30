// Tells TypeScript to allow CSS imports
declare module '*.css' {
  const content: Record<string, string>
  export default content
}