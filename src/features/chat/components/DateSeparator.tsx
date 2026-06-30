import { formatDateSeparator } from '../utils/messageUtils'

type Props = {
  date: string
}

export function DateSeparator({ date }: Props) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 border-t border-gray-200" />
      <span className="flex-shrink-0 text-[11px] font-medium text-gray-500">
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  )
}
