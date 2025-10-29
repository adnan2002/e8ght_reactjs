
/
├── /login          (Public)
├── /signup         (Public)
├── /auth/google    (Public, redirect for OAuth)
├── /dashboard      (Protected, redirects to /login if not authenticated)
│   ├── /freelancer
│   │   ├── /projects
│   │   ├── /profile
│   ├── /customer
│       ├── /jobs
│       ├── /profile
├── /about          (Public)
