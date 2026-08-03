import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** Password field with a visibility toggle — typing a strong password
 *  blind is how accounts get locked. RTL-safe (uses logical properties). */
export default function PasswordInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} pe-11`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute end-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/80"
      >
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  )
}
