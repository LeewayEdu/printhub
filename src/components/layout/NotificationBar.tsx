'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

export default function NotificationBar() {
  const [notification, setNotification] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    supabase.from('notifications').select('*').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setNotification(data) })
  }, [])

  if (!notification || dismissed) return null

  return (
    <div style={{ background: notification.bg_color || '#C0392B', color: 'white', padding: '9px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' as const, zIndex: 101, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden', textAlign: 'center' as const }}>
        {notification.type === 'rolling' ? (
          <div style={{ display: 'inline-block', animation: 'notifScroll 20s linear infinite', whiteSpace: 'nowrap' as const, fontSize: 13, fontFamily: 'Open Sans' }}>
            {notification.message}
            {notification.link_text && notification.link_url && (
              <> &nbsp;·&nbsp; <a href={notification.link_url} style={{ color: 'white', fontWeight: 700, textDecoration: 'underline' }}>{notification.link_text}</a></>
            )}
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            {notification.message}
            {notification.link_text && notification.link_url && (
              <> &nbsp;·&nbsp; <a href={notification.link_url} style={{ color: 'white', fontWeight: 700, textDecoration: 'underline' }}>{notification.link_text}</a></>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 13, fontFamily: 'Open Sans' }}>
            {notification.message}
            {notification.link_text && notification.link_url && (
              <> &nbsp;<a href={notification.link_url} style={{ color: 'white', fontWeight: 700, textDecoration: 'underline', marginLeft: 8 }}>{notification.link_text} &rarr;</a></>
            )}
          </span>
        )}
      </div>
      <button onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', flexShrink: 0, padding: 4 }}>
        <X size={15} />
      </button>
      <style>{`
        @keyframes notifScroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  )
}
