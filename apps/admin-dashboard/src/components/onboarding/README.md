# Onboarding System Components

This directory contains all the components for the Glavito onboarding wizard system.

## Structure

```
onboarding/
├── onboarding-wizard.tsx          # Main wizard orchestrator
├── steps/                         # Individual step components
│   ├── welcome-step.tsx
│   ├── organization-setup-step.tsx
│   ├── channel-configuration-step.tsx
│   ├── ai-configuration-step.tsx
│   ├── knowledge-base-step.tsx
│   ├── payment-setup-step.tsx
│   ├── team-management-step.tsx
│   ├── workflow-configuration-step.tsx
│   ├── customer-portal-step.tsx
│   ├── data-import-step.tsx
│   └── analytics-setup-step.tsx
└── README.md                      # This file
```

## Key Components

### OnboardingWizard
The main orchestrator component that:
- Manages step navigation and progress
- Handles state management integration
- Provides consistent UI layout
- Manages loading and error states

### Step Components
Each step component follows a consistent interface:

```typescript
interface StepProps {
  data: any;                    // Current step data from session
  onComplete: (data: any) => Promise<void>;  // Completion callback
  isLoading: boolean;           // Loading state
}
```

## Features

### 🎨 Modern UI/UX
- Gradient backgrounds and glassmorphism effects
- Smooth animations and transitions
- Responsive design for all devices
- Consistent color scheme and typography

### 📊 Progress Tracking
- Visual progress bar with percentage
- Step-by-step navigation indicators
- Estimated time remaining
- Completion status for each step

### 💾 State Management
- Automatic progress saving with Zustand
- Session persistence across browser refreshes
- Error recovery and retry mechanisms
- Real-time progress updates

### 🌐 Internationalization
- Full i18n support with next-intl
- Translation keys for all text content
- Support for multiple languages (EN, FR, AR)
- RTL language support ready

## Step Details

### 1. Welcome Step
- Feature overview with animated cards
- Expectation setting and time estimates
- Engaging introduction to the platform

### 2. Organization Setup
- Company information collection
- Address and contact details
- Timezone configuration
- Form validation and error handling

### 3. Channel Configuration
- Multi-channel integration setup
- WhatsApp, Instagram, Email, Facebook
- Connection testing and validation
- Configuration help and documentation

### 4. AI Configuration
- AI feature selection and configuration
- Confidence threshold settings
- Feature categorization (automation, analysis, enhancement)
- Premium feature indicators

### 5. Knowledge Base
- Category and article management
- Content creation and organization
- Publishing and draft management
- Template and import options

### 6. Payment Setup
- Stripe integration configuration
- Manual billing options
- Security notices and best practices
- Currency and billing settings

### 7. Team Management
- Team creation and organization
- Member invitation system
- Role and permission management
- Skills and availability tracking

### 8. Workflow Configuration
- SLA rule configuration
- Auto-assignment settings
- Escalation path setup
- Business hours integration

### 9. Customer Portal
- Portal customization and branding
- Feature selection and configuration
- Real-time preview functionality
- Domain and subdomain setup

### 10. Data Import
- CSV and platform migration options
- Data type selection and mapping
- Import settings and validation
- Template downloads and guidance

### 11. Analytics Setup
- Dashboard widget configuration
- Automated reporting setup
- KPI tracking and targets
- External integration options

## Usage

### Basic Implementation
```typescript
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { useOnboardingStore } from '@/lib/store/onboarding-store';

export default function OnboardingPage() {
  const { session, progress, updateStep, completeOnboarding } = useOnboardingStore();

  return (
    <OnboardingWizard
      session={session}
      progress={progress}
      onStepComplete={updateStep}
      onComplete={completeOnboarding}
    />
  );
}
```

### Custom Step Component
```typescript
interface CustomStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function CustomStep({ data, onComplete, isLoading }: CustomStepProps) {
  const t = useTranslations('onboarding.steps.custom');
  
  const handleSubmit = async (formData: any) => {
    await onComplete(formData);
  };

  return (
    <div className="space-y-6">
      {/* Step content */}
    </div>
  );
}
```

## Styling Guidelines

### Color Scheme
- Primary: Blue to Purple gradients (`from-blue-500 to-purple-500`)
- Success: Green gradients (`from-green-400 to-emerald-500`)
- Warning: Yellow/Orange tones
- Error: Red tones
- Neutral: Gray scale with proper contrast

### Layout Patterns
- Card-based layouts with subtle shadows
- Consistent spacing using Tailwind's spacing scale
- Responsive grid systems (1-2-3 columns)
- Proper visual hierarchy with typography

### Animation Guidelines
- Subtle hover effects with `transform hover:scale-105`
- Loading states with spinners and pulse effects
- Smooth transitions with `transition-all duration-200`
- Progressive disclosure for complex forms

## Testing

### Unit Tests
```bash
npm run test -- onboarding
```

### Integration Tests
```bash
npm run test:e2e -- onboarding
```

### Manual Testing Checklist
- [ ] All steps load correctly
- [ ] Navigation works in both directions
- [ ] Form validation displays appropriate errors
- [ ] Progress is saved and restored
- [ ] Completion flow works end-to-end
- [ ] Responsive design on mobile/tablet
- [ ] Accessibility with keyboard navigation

## Development Tips

### Adding New Steps
1. Create step component in `steps/` directory
2. Add to `stepComponents` mapping in `onboarding-wizard.tsx`
3. Update `OnboardingStep` enum in shared types
4. Add translations to `messages/en.json`
5. Update progress calculation logic

### Customizing Styles
- Use Tailwind utility classes for consistency
- Follow the established color scheme
- Maintain responsive design patterns
- Test dark mode compatibility

### State Management
- Use the onboarding store for all state operations
- Implement optimistic updates where appropriate
- Handle loading and error states consistently
- Persist important data immediately

## Troubleshooting

### Common Issues
1. **Translation keys not found**: Check `messages/en.json` for missing keys
2. **Step not rendering**: Verify step is added to `stepComponents` mapping
3. **Progress not saving**: Check store configuration and API endpoints
4. **Styling issues**: Ensure Tailwind classes are properly applied

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` and checking browser console for detailed state information.

## Contributing

1. Follow the established component patterns
2. Add comprehensive translations for new features
3. Include unit tests for new components
4. Update this README for significant changes
5. Test across different browsers and devices

## Performance Considerations

- Components are lazy-loaded to reduce initial bundle size
- Images are optimized with Next.js Image component
- State updates are debounced to prevent excessive API calls
- Large forms are split into manageable sections

---

For more information, see the main [ONBOARDING_SYSTEM.md](../../../ONBOARDING_SYSTEM.md) documentation.