import React, { useState } from 'react';
import { Button, Flex } from 'monday-ui-react-core';

const STEPS = [
  {
    title: 'Welcome to Smart Row Highlighter!',
    description: 'Automatically highlight rows in your board based on column values. Let\'s get you started with a quick tour.',
    icon: '✨',
  },
  {
    title: 'Create Highlighting Rules',
    description: 'Click "Add Rule" to create your first rule. Select a column, choose a condition (like "equals", "contains", or "is overdue"), and pick a highlight color.',
    icon: '📝',
  },
  {
    title: 'Multiple Conditions',
    description: 'Rules can have multiple conditions combined with AND/OR logic. For example: highlight when Status is "Done" AND Due Date is overdue.',
    icon: '🔗',
  },
  {
    title: 'Prioritize with Drag & Drop',
    description: 'Drag rules to reorder them. The first matching rule wins, so put your most important rules at the top.',
    icon: '↕️',
  },
  {
    title: 'Export & Share',
    description: 'Export your rules to share with team members or use on other boards. Import rules to quickly set up new boards.',
    icon: '📤',
  },
];

function Onboarding({ onComplete, isDarkMode }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        backgroundColor: isDarkMode ? '#1c1f3b' : '#ffffff',
        borderRadius: 12,
        padding: 32,
        maxWidth: 440,
        width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16,
        }}>
          {step.icon}
        </div>

        <h2 style={{
          margin: '0 0 12px 0',
          color: isDarkMode ? '#ffffff' : '#323338',
          fontSize: 22,
          fontWeight: 600,
        }}>
          {step.title}
        </h2>

        <p style={{
          margin: '0 0 24px 0',
          color: isDarkMode ? '#c5c7d0' : '#676879',
          fontSize: 15,
          lineHeight: 1.5,
        }}>
          {step.description}
        </p>

        {/* Progress dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 24,
        }}>
          {STEPS.map((_, index) => (
            <div
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: index === currentStep
                  ? '#0073ea'
                  : (isDarkMode ? '#4b4e69' : '#c5c7d0'),
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>

        <Flex justify="Center" gap={Flex.gaps.SMALL}>
          <Button
            kind={Button.kinds.TERTIARY}
            onClick={handleSkip}
          >
            Skip
          </Button>
          <Button onClick={handleNext}>
            {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </Flex>
      </div>
    </div>
  );
}

export default Onboarding;
