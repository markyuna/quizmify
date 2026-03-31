import { signIn } from "../../auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="rounded-xl bg-black px-6 py-3 text-white"
        >
          Continuar con Google
        </button>
      </form>
    </div>
  );
}