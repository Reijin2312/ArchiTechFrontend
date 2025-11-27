export function FormHint({children, error}:{children?:React.ReactNode, error?: boolean}){
  return <p className={`hint ${error ? 'error' : ''}`}>{children}</p>;
}