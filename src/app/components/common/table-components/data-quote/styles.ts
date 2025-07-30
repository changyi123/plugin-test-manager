import { css } from '@emotion/css';
export const antPrefix = 'test-manager-plugins-front';
export const blue4 = '#5ea1ff';
const getOverlayTagStyle = (antPrefix: string): string => `
  max-width: 300px;

  .${antPrefix}-tag {
    margin-bottom: 5px;
    white-space: break-spaces;
    cursor: pointer;

    &:last-child {
      margin-right: 0;
    }
  }
  .custom-disabled {
    color: #ccc;
    pointer-events: none;
  }

  .pointer {
    cursor: pointer;

    &:hover {
      color: ${blue4};
    }
  }
`;

export const overlayTagStyle = css(getOverlayTagStyle(antPrefix));
