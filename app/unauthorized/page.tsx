import Link from "next/link";
export default function UnauthorizedPage(){return <main className="auth-page"><section className="auth-card"><h1>Access denied</h1><p>You are signed in, but you are not a member of this project.</p><Link className="button" href="/">Open my workspace</Link></section></main>}
