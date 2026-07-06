import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#06195e] flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-white text-3xl font-bold mb-2">ClaimBack</h1>
        <p className="text-white/60 text-sm">Sign in to manage your claims</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'rounded-2xl shadow-2xl border-0',
            headerTitle: 'font-serif text-[#06195e]',
            socialButtonsBlockButton: 'border border-gray-200 hover:border-[#0b2d91]',
            formButtonPrimary: 'bg-[#06195e] hover:bg-[#0b2d91] rounded-xl py-3',
            footerActionLink: 'text-[#0b2d91]',
          },
        }}
        redirectUrl="/home"
      />
    </div>
  );
}
