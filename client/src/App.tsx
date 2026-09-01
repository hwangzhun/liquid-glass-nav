/* 潮汐玻璃提醒：App 只负责提供稳定的页面入口与全局错误边界，不在这里堆叠布局；导航层级留给 Home 的目录脊柱。 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function Router({
  isAuthenticated,
  onLogin,
  onLogout,
}: {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}) {
  return (
    <Switch>
      <Route path="/">
        {() => (
          <Home
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            onLogout={onLogout}
          />
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

type AuthState = "checking" | "authenticated" | "signed-out";

function LoginScreen({
  configured,
  error,
  pending,
  onSubmit,
  onCancel,
}: {
  configured: boolean;
  error: string;
  pending: boolean;
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || pending || !configured) return;
    await onSubmit(password);
  };

  return (
    <div className="login-shell">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <main className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">
          <span>
            <i />
            <i />
          </span>
        </div>
        <p className="login-kicker">PRIVATE INDEX / ACCESS</p>
        <h1 id="login-title">欢迎回来</h1>
        <p className="login-intro">
          访客可直接浏览；输入站点密码后可以添加、编辑和整理书签。
        </p>
        <form onSubmit={submit}>
          <label htmlFor="login-password">站点密码</label>
          <div className="login-input-wrap">
            <KeyRound size={17} />
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="输入密码"
              autoComplete="current-password"
              autoFocus
              disabled={!configured || pending}
            />
          </div>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          {!configured && (
            <p className="login-error" role="alert">
              请先在部署环境中配置 NAV_PASSWORD。
            </p>
          )}
          <button
            type="submit"
            className="login-submit"
            disabled={!password || pending || !configured}
          >
            {pending ? (
              <LoaderCircle className="login-spinner" size={17} />
            ) : (
              <ShieldCheck size={17} />
            )}
            <span>{pending ? "正在验证…" : "进入管理模式"}</span>
            {!pending && <ArrowRight size={15} />}
          </button>
          <button
            type="button"
            className="secondary-button login-view-button"
            onClick={onCancel}
          >
            暂不登录，继续浏览
          </button>
        </form>
        <p className="login-cookie-note">
          登录状态会通过安全 Cookie 保留 30 天。
        </p>
      </main>
    </div>
  );
}

function PersonalAuth() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [configured, setConfigured] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth", {
          headers: { Accept: "application/json" },
        });
        const result = (await response.json().catch(() => ({}))) as {
          authenticated?: boolean;
          configured?: boolean;
        };
        if (cancelled) return;
        setConfigured(result.configured !== false);
        setAuthState(
          response.ok && result.authenticated === true
            ? "authenticated"
            : "signed-out"
        );
      } catch {
        if (!cancelled) {
          setError("暂时无法连接登录服务，请稍后重试。");
          setAuthState("signed-out");
        }
      }
    };
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (password: string) => {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        authenticated?: boolean;
        configured?: boolean;
        error?: string;
      };
      setConfigured(result.configured !== false);
      if (!response.ok || result.authenticated !== true)
        throw new Error(result.error || "登录失败，请检查密码。");
      setAuthState("authenticated");
      setLoginOpen(false);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "登录失败，请稍后重试。"
      );
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      /* the local gate still closes */
    }
    setAuthState("signed-out");
    setLoginOpen(false);
    setError("");
  };

  if (authState === "checking") {
    return (
      <div className="auth-loading" role="status">
        <LoaderCircle className="login-spinner" size={24} />
        <span>正在确认登录状态…</span>
      </div>
    );
  }
  if (authState === "signed-out" && loginOpen) {
    return (
      <LoginScreen
        configured={configured}
        error={error}
        pending={pending}
        onSubmit={login}
        onCancel={() => {
          setLoginOpen(false);
          setError("");
        }}
      />
    );
  }
  return (
    <Router
      isAuthenticated={authState === "authenticated"}
      onLogin={() => {
        setLoginOpen(true);
        setError("");
      }}
      onLogout={logout}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <PersonalAuth />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
