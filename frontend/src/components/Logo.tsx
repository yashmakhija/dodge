interface Props {
  size?: number
  className?: string
}

export default function Logo({ size = 28, className = '' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#0f172a" />
      <path
        d="M8 8h6c5.523 0 10 4.477 10 10s-4.477 10-10 10H8V8z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="12" r="2.5" fill="#3b82f6" />
      <circle cx="22" cy="18" r="2" fill="#10b981" />
      <circle cx="18" cy="23" r="2" fill="#f59e0b" />
    </svg>
  )
}
