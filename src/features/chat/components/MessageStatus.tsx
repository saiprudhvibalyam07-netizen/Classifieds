import { Check, CheckCheck, Clock, Loader2 } from 'lucide-react'

type Props = {
  status: 'sending' | 'sent' | 'delivered' | 'read'
}

function getStatusIcon(status: Props['status']) {
  switch (status) {
    case 'sending':
      return <Clock className="h-3 w-3" />
    case 'sent':
      return <Check className="h-3 w-3" />
    case 'delivered':
      return <CheckCheck className="h-3 w-3" />
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-400" />
  }
}

export function MessageStatus({ status }: Props) {
  return (
    <span className="inline-flex items-center" data-testid="message-status" aria-label={`Message ${status}`}>
      {status === 'sending' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        getStatusIcon(status)
      )}
    </span>
  )
}
