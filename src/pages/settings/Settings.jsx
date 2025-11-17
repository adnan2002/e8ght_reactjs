import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

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
  const { user, freelancerProfileStatus } = useAuth()
  const [openSection, setOpenSection] = useState(() => (SECTIONS.length > 0 ? SECTIONS[0].id : null))

  console.log('[Settings] render start', {
    user,
    freelancerProfileStatus,
    initialOpenSection: openSection,
  })

  const handleToggle = (sectionId) => {
    console.log('[Settings] handleToggle invoked', { sectionId })
    setOpenSection((previous) => {
      const next = previous === sectionId ? null : sectionId
      console.log('[Settings] openSection state update', { previous, next })
      return next
    })
  }

  const sections = useMemo(() => {
    console.log('[Settings] computing sections', {
      userRole: user?.role,
      freelancerProfileStatus,
    })
    return SECTIONS.map((section) => {
      if (section.id !== 'profile') {
        console.log('[Settings] section passthrough', { sectionId: section.id })
        return section
      }

      if (user?.role === 'freelancer' && freelancerProfileStatus === 'ready') {
        console.log('[Settings] enhancing profile section with freelancer actions')
        const actions = [
          ...section.actions,
          {
            id: 'view-freelancer-services',
            label: 'View freelancer services',
            to: '/settings/freelancer-services/view',
            variant: 'secondary',
          },
          {
            id: 'create-freelancer-services',
            label: 'Add freelancer services',
            to: '/settings/freelancer-services/create',
            variant: 'secondary',
          },
          {
            id: 'manage-freelancer-schedule',
            label: 'Manage freelancer schedule',
            to: '/settings/freelancer-schedule',
            variant: 'primary',
          },
          {
            id: 'edit-freelancer-profile',
            label: 'Edit freelancer profile',
            to: '/settings/freelancer-profile',
            variant: 'primary',
          },
        ]
        return { ...section, actions }
      }

      console.log('[Settings] profile section unchanged', {
        userRole: user?.role,
        freelancerProfileStatus,
      })
      return section
    })
  }, [freelancerProfileStatus, user?.role])

  useEffect(() => {
    console.log('[Settings] openSection changed', { openSection })
  }, [openSection])

  useEffect(() => {
    console.log('[Settings] sections updated', { sectionIds: sections.map((section) => section.id) })
  }, [sections])

  return (
    <section className="page settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">Manage your account preferences and quick actions.</p>
      </header>

      <div className="settings-accordion">
        {sections.map((section) => {
          const isOpen = openSection === section.id
          console.log('[Settings] rendering accordion item', { sectionId: section.id, isOpen })
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

