import { CSSProperties, ReactNode, createContext, useCallback, useEffect, useState } from 'react';

/**
 * Enum representing the possible vertical positions for the tooltip.
 */
export enum VerticalPosition {
    Top = 'top',
    Bottom = 'bottom',
    Middle = 'middle',
}

/**
 * Enum representing the possible horizontal positions for the tooltip.
 */
export enum HorizontalPosition {
    Left = 'left',
    Right = 'right',
    Center = 'center',
}

/**
 * Interface for each step in the tutorial.
 */
export interface Step {
    elementId: string;
    text: string;
    verticalPosition?: VerticalPosition;
    horizontalPosition?: HorizontalPosition;
    verticalOffset?: number;
    horizontalOffset?: number;
    tooltipStyle?: CSSProperties;
}

/**
 * Type for the tutorial context, which includes the active step and an array of steps.
 */
interface TutorialContextType {
    activeStep: number;
    steps: Step[];
}

/**
 * The tutorial context created with a default undefined value.
 */
export const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

/**
 * Properties for the TutorialProvider component.
 */
interface TutorialProviderProps {
    children: ReactNode | undefined;
    steps: Step[];
    dimStyle?: CSSProperties;
    showTooltip?: boolean;
}

const defaultTooltipStyle: CSSProperties = {
    transition: 'opacity 1s',
    position: 'absolute',
    maxWidth: '300px',
    top: 0,
    left: 0,
    backgroundColor: '#212121',
    fontSize: '0.8rem',
    color: '#f5f5f5',
    padding: '0.5rem',
    zIndex: 1001,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.8)',
    borderRadius: '2px',
};

const defaultButtonStyle = {
    backgroundColor: '#212121',
    color: '#f5f5f5',
    border: '1px solid #f5f5f5',
    padding: '0.5rem',
    borderRadius: '2px',
    cursor: 'pointer',
};

const defaultDimStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
};

const defaultBodyDimStyle: CSSProperties = {
    ...defaultDimStyle,
    position: 'fixed',
    margin: 0,
    padding: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
};


/**
 * Provides a tutorial context and manages the state and lifecycle of a guided tutorial.
 * It controls the positioning and display of tooltips relative to target elements,
 * handles navigation between tutorial steps, and manages the dimming effect on the rest of the page.
 *
 * @param {TutorialProviderProps} props - The props for the TutorialProvider component.
 * @param {ReactNode | undefined} props.children - The child components that may consume the tutorial context.
 * @param {Step[]} props.steps - An array of step objects that define the text and positioning for each tooltip in the tutorial sequence.
 * @param {CSSProperties} [props.dimStyle] - Optional custom styles to apply to the dimming effect overlay. If not provided, a default style is applied.
 * @param {boolean} [props.showTooltip] - Optional value controlling whether we should show the tooltip.
 */
export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children, steps, dimStyle, showTooltip }) => {
    const [activeStep, setActiveStep] = useState(showTooltip ? 0 : -1);
    const step=steps[activeStep];
    const [curTooltipStyle, setCurrentTooltipStyle] = useState<CSSProperties>({
        ...defaultTooltipStyle,
        ...step?.tooltipStyle,
    });

    const updateTooltipPosition = useCallback(() => {
        if (activeStep < 0) return;
        const step = steps[activeStep];
        const target = document.getElementById(step.elementId);
        if (!target) return;
        const targetRect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;

        let top = targetRect.top + scrollTop;
        let left = targetRect.left + scrollLeft;

        // Adjust for vertical position
        switch (step.verticalPosition) {
            case 'top':
                top -= target.offsetHeight;
                break;
            case 'bottom':
                top += target.offsetHeight;
                break;
            case 'middle':
            default:
                top += target.offsetHeight / 2;
                break;
        }
        top+=step.verticalOffset ?? 0;

        // Adjust for horizontal position
        switch (step.horizontalPosition) {
            case 'left':
                left -= target.offsetWidth;
                break;
            case 'right':
                left += target.offsetWidth;
                break;
            case 'center':
            default:
                left += target.offsetWidth / 2;
                break;
        }
        left+=step.horizontalOffset ?? 0;

        // Tooltip width might not be determined until after rendering, but we can assume a max width
        const tooltipWidth = 300;
        const centerOffset = tooltipWidth / 2;

        // Adjust position to align tooltip box, considering its width
        if (step.horizontalPosition === 'center') {
            left -= centerOffset;
        }

        // Prevent tooltip from going off the edge of the screen
        left = Math.max(0, Math.min(left, window.innerWidth - tooltipWidth));
        top = Math.max(0, Math.min(top, window.innerHeight));

        setCurrentTooltipStyle((prevStyle) => ({
            ...prevStyle,
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
        }));
    }, [activeStep, steps]);

    const handleClose = useCallback(() => {
        setActiveStep(-1);
        window.removeEventListener('resize', updateTooltipPosition);
    }, [updateTooltipPosition]);

    const handleNext = useCallback(() => {
        if (activeStep === steps.length - 1) {
            handleClose();
            return;
        }

        setActiveStep((prevStep) => {
            setCurrentTooltipStyle({
                ...defaultTooltipStyle,
                ...steps[prevStep+1]?.tooltipStyle,
            })
            return prevStep+1;
        });
    }, [activeStep, handleClose, steps]);

    useEffect(() => {
        updateTooltipPosition();
        window.addEventListener('resize', updateTooltipPosition);
        return () => {
            window.removeEventListener('resize', updateTooltipPosition);
        };
    }, [updateTooltipPosition]);

    if (activeStep < 0) {
        return <>{children}</>;
    }

    return (
        <TutorialContext.Provider value={{ activeStep, steps }}>
            {curTooltipStyle && (
                <Tooltip text={steps[activeStep].text} style={curTooltipStyle} onClose={handleClose} onNext={activeStep!==steps.length-1 ? handleNext : null} />
            )}
            <div style={dimStyle ? {
                ...dimStyle,
                position: 'fixed',
                margin: 0,
                padding: 0,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            } : defaultBodyDimStyle}></div>
            {children}
        </TutorialContext.Provider>
    );
};

export const Tooltip = ({
    text,
    style,
    onClose,
    onNext,
}: {
    text: string;
    style: CSSProperties;
    onClose: () => void;
    onNext: (() => void) | null;
}) => {
    return (
        <div style={style}>
            <p>{text}</p>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        ...defaultButtonStyle,
                        marginRight: '0.5rem',
                    }}
                >
                    Close
                </button>
                {onNext && <button onClick={onNext} style={defaultButtonStyle}>
                    Next
                </button>}
            </div>
        </div>
    );
};
