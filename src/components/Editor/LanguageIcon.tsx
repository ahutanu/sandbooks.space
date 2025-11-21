import { SiPython, SiJavascript, SiTypescript, SiGnubash, SiGo } from 'react-icons/si';
import { VscTerminal } from 'react-icons/vsc';

interface LanguageIconProps {
  language: string;
  size?: number;
  className?: string;
}

/**
 * Displays programming language icons using react-icons
 * Uses Simple Icons (Si prefix) for language logos
 * Falls back to terminal icon for unknown languages
 */
export function LanguageIcon({ language, size = 14, className = '' }: LanguageIconProps) {
  const normalizedLang = language.toLowerCase();

  const iconProps = {
    size,
    className,
    'aria-hidden': 'true' as const,
  };

  switch (normalizedLang) {
    case 'python':
    case 'py':
      return <SiPython {...iconProps} />;

    case 'javascript':
    case 'js':
      return <SiJavascript {...iconProps} />;

    case 'typescript':
    case 'ts':
      return <SiTypescript {...iconProps} />;

    case 'bash':
    case 'sh':
    case 'shell':
      return <SiGnubash {...iconProps} />;

    case 'go':
    case 'golang':
      return <SiGo {...iconProps} />;

    default:
      return <VscTerminal {...iconProps} />;
  }
}
