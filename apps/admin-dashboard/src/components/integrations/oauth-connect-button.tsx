'use client';

import React, { useState, cloneElement, isValidElement, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FaSpinner, FaShieldAlt, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { getIntegrationIcon, getIntegrationColor } from '@/lib/icons/integration-icons';
import { useIntegrationsStore } from '@/lib/store/integrations-store';
import { integrationsApi } from '@/lib/api/integrations';
// Optional confetti import
let confetti: any = null;
try {
  confetti = require('canvas-confetti');
} catch {
  // confetti not installed, skip celebration
}

interface OAuthConnectButtonProps {
  provider: string;
  providerName: string;
  scopes?: string[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  children?: React.ReactNode;
}

export function OAuthConnectButton({
  provider,
  providerName,
  scopes = [],
  onSuccess,
  onError,
  children,
}: OAuthConnectButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [docs, setDocs] = useState<{ name?: string; description?: string; setup?: string[]; env?: string[] } | null>(null);
  const { getAuthorizeUrl, oauthCallback } = useIntegrationsStore();

  const IconComponent = getIntegrationIcon(provider);
  const iconColor = getIntegrationColor(provider);

  useEffect(() => {
    if (!isModalOpen) return;
    let mounted = true;
    integrationsApi.getConnectorDocs(provider).then((d) => {
      if (mounted) setDocs(d as any);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [isModalOpen, provider]);

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const redirectUri = `${window.location.origin}/api/oauth/return`;
      const state = `${provider}:${Date.now()}`;

      // Get OAuth URL
      const result = await getAuthorizeUrl(provider, redirectUri, state);
      const authUrl = typeof result === 'string' ? result : result.url;

      // Open popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== 'oauth_return') return;

        try {
          const { code, state: returnedState, error, error_description } = event.data;
          
          // Handle OAuth errors
          if (error || !code) {
            const errorMsg = error_description || error || 'Authorization failed';
            setIsConnecting(false);
            onError?.(errorMsg);
            setIsModalOpen(false);
            return;
          }

          // Exchange code for token
          const result = await oauthCallback(provider, {
            code,
            state: returnedState,
            redirectUri,
            error,
            error_description,
          });

          if (!result.ok) {
            throw new Error(result.error_description || result.error || 'Connection failed');
          }

          // Success!
          setConnectionSuccess(true);
          setIsConnecting(false);

          // Fire confetti if available
          if (confetti) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }

          // Close modal after delay
          setTimeout(() => {
            setIsModalOpen(false);
            setConnectionSuccess(false);
            onSuccess?.();
          }, 2000);
        } catch (error: any) {
          setIsConnecting(false);
          onError?.(error?.message || 'Connection failed');
          setIsModalOpen(false);
        }

        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        }
      }, 500);
    } catch (error: any) {
      setIsConnecting(false);
      onError?.(error?.message || 'Connection failed');
    }
  };

  const handleOpenModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsModalOpen(true);
  };

  return (
    <>
      {children && isValidElement(children) ? (
        cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
          onClick: (e: React.MouseEvent) => {
            handleOpenModal(e);
            // Call original onClick if it exists
            const originalOnClick = (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick;
            if (originalOnClick) {
              originalOnClick(e);
            }
          },
        })
      ) : (
        <Button onClick={handleOpenModal}>
          Connect {providerName}
        </Button>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          {connectionSuccess ? (
            // Success state
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                  <FaCheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2">Connected!</h3>
              <p className="text-muted-foreground text-center">
                {providerName} has been successfully connected.
              </p>
            </div>
          ) : (
            // Connection flow
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-2 flex items-center justify-center">
                    <IconComponent
                      className="h-full w-full"
                      size={40}
                      color={iconColor}
                    />
                  </div>
                  <div className="flex-1">
                    <DialogTitle>Connect {providerName}</DialogTitle>
                    <DialogDescription className="text-xs">
                      Authorize access to sync your data
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Stepper */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium">1. Review</span>
                  </div>
                  <div className="h-px w-6 bg-border" />
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isConnecting ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    <span className="font-medium">2. Authorize</span>
                  </div>
                  <div className="h-px w-6 bg-border" />
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${connectionSuccess ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                    <span className="font-medium">3. Connected</span>
                  </div>
                </div>

                {/* Permissions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FaShieldAlt className="h-4 w-4 text-primary" />
                    <span>This integration will be able to:</span>
                  </div>
                  <ul className="space-y-2 ml-6">
                    {scopes.length > 0 ? (
                      scopes.map((scope) => (
                        <li key={scope} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{scope}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span>Read and sync your contacts and leads</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span>Update records when changes are made</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span>Access basic account information</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Security note */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FaShieldAlt className="h-4 w-4 text-primary" />
                    <span>Secure Connection</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We use OAuth 2.0 for secure authentication. Your credentials are never stored on our servers.
                  </p>
                </div>

                {/* Docs link */}
                {docs?.name && (
                  <div className="text-xs text-muted-foreground">
                    <a
                      href={typeof window !== 'undefined' ? `https://google.com/search?q=${encodeURIComponent(`${docs.name} oauth scopes`)}`
                        : '#'} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <FaExternalLinkAlt className="h-3 w-3" />
                      Provider docs: {docs.name}
                    </a>
                  </div>
                )}

                {/* Data sync info */}
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Auto-sync every 10 min
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Encrypted in transit
                  </Badge>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isConnecting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full sm:w-auto"
                >
                  {isConnecting ? (
                    <>
                      <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <FaExternalLinkAlt className="mr-2 h-4 w-4" />
                      Authorize Access
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

