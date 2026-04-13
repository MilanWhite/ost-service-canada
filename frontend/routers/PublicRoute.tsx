import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CenteredSpinner from "../components/CenteredSpinner";
import PublicAnnouncementBanner from "../components/PublicAnnouncementBanner";
import { URLS } from "../src/config/navigation";
import { fetchAuthSession } from "aws-amplify/auth";

interface PublicProps {
    children: ReactNode;
}

const PUBLIC_ANNOUNCEMENT_DISMISSED_KEY = "public-announcement-dismissed";

export function PublicRoute({ children }: PublicProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [announcementDismissed, setAnnouncementDismissed] = useState(() => {
        if (typeof window === "undefined") return false;

        return (
            window.localStorage.getItem(PUBLIC_ANNOUNCEMENT_DISMISSED_KEY) ===
            "true"
        );
    });

    const handleDismissAnnouncement = () => {
        setAnnouncementDismissed(true);

        if (typeof window !== "undefined") {
            window.localStorage.setItem(
                PUBLIC_ANNOUNCEMENT_DISMISSED_KEY,
                "true"
            );
        }
    };

    useEffect(() => {
        async function checkSession() {
            try {
                const session = await fetchAuthSession();
                const groups =
                    session.tokens?.accessToken.payload["cognito:groups"];
                if (Array.isArray(groups) && groups.includes("Admin")) {
                    navigate(URLS.adminHome, { replace: true });
                } else if (Array.isArray(groups)) {
                    navigate(URLS.home, { replace: true });
                } else {
                    setAllowed(true);
                }
            } catch {
                setAllowed(true);
            } finally {
                setLoading(false);
            }
        }
        checkSession();
    }, [navigate, location.pathname]);

    if (loading) return <CenteredSpinner />;
    return (
        <>
            {allowed ? (
                <>
                    {!announcementDismissed ? (
                        <PublicAnnouncementBanner
                            onDismiss={handleDismissAnnouncement}
                        />
                    ) : null}
                    {children}
                </>
            ) : null}
        </>
    );
}
