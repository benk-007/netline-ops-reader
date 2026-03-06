import { useState, useEffect } from 'react'
import { Moon, Bell, Clock, Save, CheckCircle } from 'lucide-react'
import styles from './Settings.module.css'

const DEFAULTS = { darkMode: false, notifications: true, timezone: 'UTC' }

function loadSettings() {
  try {
    const stored = localStorage.getItem('ram_settings')
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS }
  } catch { return { ...DEFAULTS } }
}

export default function Settings() {
  const [s, setS] = useState(loadSettings)
  const [saved, setSaved] = useState(false)

  function toggle(key) {
    setS(p => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  function setTimezone(val) {
    setS(p => ({ ...p, timezone: val }))
    setSaved(false)
  }

  function save() {
    localStorage.setItem('ram_settings', JSON.stringify(s))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your OCC dashboard preferences</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>

          {/* Dark Mode */}
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <div className={styles.rowIcon} style={{ background: '#1e293b' }}>
                <Moon size={16} />
              </div>
              <div>
                <p className={styles.rowLabel}>Dark Mode</p>
                <p className={styles.rowDesc}>Switch interface to dark theme</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${s.darkMode ? styles.toggleOn : ''}`}
              onClick={() => toggle('darkMode')}
              aria-pressed={s.darkMode}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notifications</h2>

          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <div className={styles.rowIcon} style={{ background: '#2563eb' }}>
                <Bell size={16} />
              </div>
              <div>
                <p className={styles.rowLabel}>Push Notifications</p>
                <p className={styles.rowDesc}>Receive alerts for delays and status changes</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${s.notifications ? styles.toggleOn : ''}`}
              onClick={() => toggle('notifications')}
              aria-pressed={s.notifications}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Time &amp; Date</h2>

          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <div className={styles.rowIcon} style={{ background: '#D71920' }}>
                <Clock size={16} />
              </div>
              <div>
                <p className={styles.rowLabel}>Timezone</p>
                <p className={styles.rowDesc}>Used across Gantt chart and status views</p>
              </div>
            </div>
            <div className={styles.tzSegment}>
              <button
                className={`${styles.tzBtn} ${s.timezone === 'UTC' ? styles.tzActive : ''}`}
                onClick={() => setTimezone('UTC')}
              >UTC</button>
              <button
                className={`${styles.tzBtn} ${s.timezone === 'Local' ? styles.tzActive : ''}`}
                onClick={() => setTimezone('Local')}
              >Local</button>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={save}>
            {saved
              ? <><CheckCircle size={16} /> Saved!</>
              : <><Save size={16} /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
