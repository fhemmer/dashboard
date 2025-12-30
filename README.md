# Dashboard

<p align="left">
  <a href="https://github.com/HemSoft/dashboard/deployments"><img src="https://img.shields.io/github/deployments/HemSoft/dashboard/production?label=vercel&logo=vercel&logoColor=white" alt="Vercel Deployment" /></a>
  <a href="https://github.com/HemSoft/dashboard/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HemSoft/dashboard" alt="License" /></a>
</p>

### Built With

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Supabase](https://supabase.com/) project (for auth and database)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Required - Supabase
NEXT_PUBLIC_SUPABASE_PROJECT_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SECRET_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:5001
GITHUB_DASHBOARD_CLIENT_ID=your-github-oauth-client-id
GITHUB_DASHBOARD_CLIENT_SECRET=your-github-oauth-client-secret
RESEND_API_KEY=your-resend-api-key
CRON_SECRET=your-cron-secret
```

## Getting Started

First, install dependencies and run the development server:

```bash
bun install
bun dev
```

Open [http://localhost:5001](http://localhost:5001) with your browser to see the result.

The page auto-updates as you edit files.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
