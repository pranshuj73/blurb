import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AppAlertAction = {
  label: string;
  style?: 'default' | 'cancel' | 'destructive';
  value?: string;
};

type AppAlertOptions = {
  title: string;
  message?: string;
  actions?: AppAlertAction[];
};

type AppAlertContextValue = {
  showAlert: (options: AppAlertOptions) => Promise<string>;
};

type ActiveAlert = AppAlertOptions & {
  resolve: (value: string) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);

  const showAlert = useCallback((options: AppAlertOptions) => {
    return new Promise<string>((resolve) => {
      setActiveAlert({
        ...options,
        resolve,
      });
    });
  }, []);

  const handleAction = useCallback(async (action: AppAlertAction) => {
    setActiveAlert((current) => {
      if (!current) return null;
      current.resolve(action.value ?? action.label);
      return null;
    });
  }, []);

  const contextValue = useMemo(() => ({ showAlert }), [showAlert]);
  const actions: AppAlertAction[] = activeAlert?.actions?.length
    ? activeAlert.actions
    : [{ label: 'OK', style: 'default', value: 'ok' }];

  return (
    <AppAlertContext.Provider value={contextValue}>
      {children}
      {activeAlert ? (
        <View style={styles.overlay}>
          <View style={styles.scrim} />
          <View style={styles.dialog}>
            <Text style={styles.title}>{activeAlert.title}</Text>
            {activeAlert.message ? <Text style={styles.message}>{activeAlert.message}</Text> : null}
            <View style={styles.actionsRow}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={`${action.label}-${action.value ?? action.label}`}
                  style={[
                    styles.actionButton,
                    action.style === 'cancel' && styles.actionButtonSecondary,
                    action.style === 'destructive' && styles.actionButtonDestructive,
                  ]}
                  onPress={() => void handleAction(action)}
                  activeOpacity={0.86}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      action.style === 'cancel' && styles.actionButtonTextSecondary,
                      action.style === 'destructive' && styles.actionButtonTextDestructive,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within AppAlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#0C0C0E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: BlurbColors.text,
    fontFamily: 'Manrope',
  },
  message: {
    ...BlurbTypography.body,
    color: 'rgba(255,255,255,0.7)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F1',
    paddingHorizontal: 14,
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionButtonDestructive: {
    backgroundColor: '#F4F4F1',
  },
  actionButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.background,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: BlurbColors.text,
  },
  actionButtonTextDestructive: {
    color: '#B42318',
  },
});
