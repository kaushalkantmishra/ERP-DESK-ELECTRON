import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated } = useAppContext();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
