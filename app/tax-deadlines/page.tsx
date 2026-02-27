// app/tax-deadlines/page.tsx
// Evergreen URL that redirects to the current year's deadline page
import { redirect } from 'next/navigation';

export default function TaxDeadlinesRedirect() {
  redirect('/tax-deadlines-2026');
}
