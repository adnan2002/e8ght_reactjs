import { useState } from 'react'
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    id: 'addresses',
    title: 'Addresses',
    description: 'Manage the locations you share with providers and create new ones when needed.',
    actions: [
      {
        id: 'view-addresses',
        label: 'View addresses',
        to: '/addresses',
        variant: 'secondary',
      },
      {
        id: 'create-address',
        label: 'Create address',
        to: '/addresses/new',
        variant: 'primary',
      },
    ],
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Update personal information such as your name, phone number, or avatar. Coming soon.',
    actions: [],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Change your password, enable multi-factor authentication, and review recent activity. Coming soon.',
    actions: [],
  },
]

export default function Settings() {
  const [openSection, setOpenSection] = useState(() => (SECTIONS.length > 0 ? SECTIONS[0].id : null))

  const handleToggle = (sectionId) => {
    setOpenSection((previous) => (previous === sectionId ? null : sectionId))
  }

  return (
    <section className="page settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">Manage your account preferences and quick actions.</p>
      </header>

      <div className="settings-accordion">
        {SECTIONS.map((section) => {
          const isOpen = openSection === section.id
          return (
            <article key={section.id} className={`accordion-item${isOpen ? ' open' : ''}`}>
              <button
                type="button"
                className="accordion-trigger"
                aria-expanded={isOpen}
                onClick={() => handleToggle(section.id)}
              >
                <span>{section.title}</span>
                <span className="accordion-icon" aria-hidden="true">{isOpen ? '-' : '+'}</span>
              </button>
              <div className="accordion-content" hidden={!isOpen}>
                <p className="accordion-description">{section.description}</p>
                {section.actions.length > 0 ? (
                  <div className="accordion-actions">
                    {section.actions.map((action) => (
                      <Link
                        key={action.id}
                        to={action.to}
                        className={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="accordion-empty">Nothing to configure yet.</p>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

