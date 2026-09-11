# CrowdFund 🇪🇬

A community-powered crowdfunding platform designed for creators and supporters in Egypt.

CrowdFund gives people a simple and secure way to create fundraising projects, discover meaningful ideas, and support projects they believe in.

---

## 📌 Project Overview

CrowdFund is a full-stack crowdfunding web application built as a team project.

The platform is designed around three main goals:

- Make it easy for users to create and manage crowdfunding projects.
- Give supporters a simple way to discover and contribute to projects.
- Provide a secure authentication and account-management system.

The project is being developed with a clear separation between frontend, backend, and team responsibilities.

---

## ✨ Main Features

### Authentication & Account Management

- User registration
- First name and last name
- Email-based authentication
- Egyptian mobile number validation
- Password validation
- Password confirmation
- Optional profile picture
- Email account activation
- Activation link expires after 24 hours
- Users cannot log in before activating their account
- JWT-based authentication
- Access and refresh tokens
- Secure logout with refresh-token blacklisting
- Forgot password
- Password reset using a secure token
- Responsive authentication pages

### User Profile

Planned / in progress:

- View user profile
- Edit profile information
- Change profile picture
- Optional birthdate
- Optional Facebook profile
- Optional country
- View user's projects
- View user's donations
- Delete account with confirmation

### Crowdfunding Projects

Planned / in progress:

- Create projects
- Edit projects
- Delete projects
- Project details
- Project images
- Funding targets
- Project categories
- Project search and browsing
- Project ownership and permissions

### Donations & Interactions

Planned / in progress:

- Make donations
- View donation history
- Project comments
- Project ratings
- User interactions with projects

### Administration

Planned / in progress:

- Admin dashboard
- Manage users
- Manage projects
- Review reported content
- Manage platform activity

---

## 🛠 Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API
- Local Storage

### Backend

- Python
- Django
- Django REST Framework
- Simple JWT
- Django CORS Headers

### Database

- SQLite for development

### File Handling

- Pillow
- Django Media Storage

### Development Tools

- Git
- GitHub
- Visual Studio Code

---

## 🏗 Project Structure

```text
crowdfunding/
│
├── backend/
│   │
│   ├── accounts/
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── tokens.py
│   │   ├── validators.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── ...
│   │
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   ├── manage.py
│   └── db.sqlite3
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   │
│   ├── register.html
│   ├── register.js
│   │
│   ├── login.html
│   ├── login.js
│   │
│   ├── activate.html
│   ├── activate.js
│   │
│   ├── forgot-password.html
│   ├── forgot-password.js
│   │
│   ├── reset-password.html
│   └── reset-password.js
│
├── .gitignore
└── README.md
