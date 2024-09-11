import React from "react";

export const ExpandIcon = (props) => (
  <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M10.5 5V1.022L6.5 1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 11.023H0.5V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
ExpandIcon.displayName = "ExpandIcon";

export const RemoveIcon = (props) => (
  <svg width="11" height="2" viewBox="0 0 11 2" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M0.5 1H10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
RemoveIcon.displayName = "RemoveIcon";

export const MinimizeIcon = RemoveIcon;
MinimizeIcon.displayName = "MinimizeIcon";

export const MaximizeIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.5 5C5.22386 5 5 5.22386 5 5.5V15.5C5 15.7761 5.22386 16 5.5 16H15.5C15.7761 16 16 15.7761 16 15.5V5.5C16 5.22386 15.7761 5 15.5 5H5.5ZM15 6H6L6 15H15V6Z"
      fill="currentColor"
    />
  </svg>
);
MaximizeIcon.displayName = "MaximizeIcon";

export const AddIcon = (props) => (
  <svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M0.5 6H10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 1V11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
AddIcon.displayName = "AddIcon";

export const ConnectIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M4.38758 11.6909C3.83908 11.1405 3.5 10.3813 3.5 9.54289C3.5 7.86235 4.86235 6.5 6.54289 6.5H11.4571C13.1377 6.5 14.5 7.86235 14.5 9.54289C14.5 11.2234 13.1377 12.5 11.4571 12.5H9"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M16.6124 10.3091C17.1609 10.8595 17.5 11.6187 17.5 12.4571C17.5 14.1377 16.1377 15.5 14.4571 15.5L9.54289 15.5C7.86235 15.5 6.5 14.1377 6.5 12.4571C6.5 10.7766 7.86235 9.5 9.54289 9.5H12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
ConnectIcon.displayName = "ConnectIcon";

export const ImportIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M9.5 3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V15.5C3.5 16.6046 4.39543 17.5 5.5 17.5H15.5C16.6046 17.5 17.5 16.6046 17.5 15.5V5.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M13.5 10.5L10.5 13.5L7.5 10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M17.5 3.5H13.5C11.8431 3.5 10.5 4.84315 10.5 6.5V13.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
ImportIcon.displayName = "ImportIcon";

export const ListAddIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(4 6)"
    >
      <path d="m.5.5h12" />
      <path d="m.5 4.5h12" />
      <path d="m.5 8.5h7" />
      <path d="m9.5 8.5h4zm2 2v-4z" />
    </g>
  </svg>
);
ListAddIcon.displayName = "ListAddIcon";

export const KeepIcon = (props) => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M8.5 4.5C9.60457 4.5 10.5 3.60457 10.5 2.5C10.5 1.39543 9.60457 0.5 8.5 0.5C7.39543 0.5 6.5 1.39543 6.5 2.5C6.5 3.60457 7.39543 4.5 8.5 4.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.5 4.5C3.60457 4.5 4.5 3.60457 4.5 2.5C4.5 1.39543 3.60457 0.5 2.5 0.5C1.39543 0.5 0.5 1.39543 0.5 2.5C0.5 3.60457 1.39543 4.5 2.5 4.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.5 10.5C3.60457 10.5 4.5 9.60457 4.5 8.5C4.5 7.39543 3.60457 6.5 2.5 6.5C1.39543 6.5 0.5 7.39543 0.5 8.5C0.5 9.60457 1.39543 10.5 2.5 10.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8.5 6.5V10.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 8.5H6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
KeepIcon.displayName = "KeepIcon";

export const SmallChevronLeftIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M11.5 14.5001L7.5 10.5001L11.5 6.50006"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
SmallChevronLeftIcon.displayName = "SmallChevronLeftIcon";

export const ChevronLeftIcon = (props) => (
  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M6.71753 12.4289L1.28896 7.00035L6.71753 1.57178"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
ChevronLeftIcon.displayName = "ChevronLeftIcon";

export const SmallChevronRightIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M9.5 14.5L13.5 10.5L9.5 6.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
SmallChevronRightIcon.displayName = "SmallChevronRightIcon";

export const ChevronRightIcon = (props) => (
  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M1.28442 1.57108L6.713 6.99965L1.28442 12.4282"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
ChevronRightIcon.displayName = "ChevronRightIcon";

export const SmallChevronUpIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m.5 4.5 4-4 4 4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(6 8)"
    />
  </svg>
);
SmallChevronUpIcon.displayName = "SmallChevronUpIcon";

export const SmallChevronDownIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m8.5.5-4 4-4-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(6 8)"
    />
  </svg>
);
SmallChevronDownIcon.displayName = "SmallChevronDownIcon";

export const ArrowUpIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(6 3)"
    >
      <path d="m8.5 4.5-4-4-4.029 4" />
      <path d="m4.5.5v13" />
    </g>
  </svg>
);
ArrowUpIcon.displayName = "ArrowUpIcon";

export const ArrowRightIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.5 6.99701L17.5 10.999L13.5 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 11H17.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
ArrowRightIcon.displayName = "ArrowRightIcon";

export const ArrowDownIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(6 4)"
    >
      <path d="m.5 9.499 4 4.001 4-4.001" />
      <path d="m4.5.5v13" transform="matrix(-1 0 0 -1 9 14)" />
    </g>
  </svg>
);
ArrowDownIcon.displayName = "ArrowDownIcon";

export const SmallCrossIcon = ({ width, height, ...rest }) => (
  <svg
    height={height || width || 9}
    width={width || 9}
    viewBox="0 0 9 9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <path d="M1.5 1.5L7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 1.5L1.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
SmallCrossIcon.displayName = "SmallCrossIcon";

export const CrossIcon = (props) => (
  <svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1}>
      <path d="m11 11-10-10" />
      <path d="m11 1-10 10" />
    </g>
  </svg>
);
CrossIcon.displayName = "CrossIcon";

export const TabIcon = (props) => (
  <svg fill="none" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        clipRule="evenodd"
        d="m5.75 4h10c1.1046 0 2 .89543 2 2v10c0 1.1046-.8954 2-2 2h-10c-1.10457 0-2-.8954-2-2v-10c0-1.10457.89543-2 2-2z"
        fillRule="evenodd"
      />
      <path d="m6.75 6h8" />
    </g>
  </svg>
);
TabIcon.displayName = "TabIcon";

export const RecallIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M8.5 13.5C11.2614 13.5 13.5 11.2614 13.5 8.5C13.5 5.73858 11.2614 3.5 8.5 3.5C5.73858 3.5 3.5 5.73858 3.5 8.5C3.5 11.2614 5.73858 13.5 8.5 13.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M17.571 17.5L12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
RecallIcon.displayName = "RecallIcon";

export const HamburgerIcon = (props) => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M1.5 1H13.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.49805 5H13.495" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 9H13.495" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
HamburgerIcon.displayName = "HamburgerIcon";

export const MenuHorizontalIcon = (props) => (
  <svg width="13" height="3" viewBox="0 0 13 3" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M6.5 2.5C7.05228 2.5 7.5 2.05228 7.5 1.5C7.5 0.947715 7.05228 0.5 6.5 0.5C5.94772 0.5 5.5 0.947715 5.5 1.5C5.5 2.05228 5.94772 2.5 6.5 2.5Z"
      fill="currentColor"
    />
    <path
      d="M1.5 2.5C2.05228 2.5 2.5 2.05228 2.5 1.5C2.5 0.947715 2.05228 0.5 1.5 0.5C0.947715 0.5 0.5 0.947715 0.5 1.5C0.5 2.05228 0.947715 2.5 1.5 2.5Z"
      fill="currentColor"
    />
    <path
      d="M11.5 2.5C12.0523 2.5 12.5 2.05228 12.5 1.5C12.5 0.947715 12.0523 0.5 11.5 0.5C10.9477 0.5 10.5 0.947715 10.5 1.5C10.5 2.05228 10.9477 2.5 11.5 2.5Z"
      fill="currentColor"
    />
  </svg>
);
MenuHorizontalIcon.displayName = "MenuHorizontalIcon";

export const MailIcon = (props) => (
  <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.5 1H12.5C13.6046 1 14.5 1.89543 14.5 3V11C14.5 12.1046 13.6046 13 12.5 13H2.5C1.39543 13 0.5 12.1046 0.5 11V3C0.5 1.89543 1.39543 1 2.5 1Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.5 3H11.5C12.0523 3 12.5 3.44772 12.5 4V5C12.5 5.55228 12.0523 6 11.5 6H10.5C9.94772 6 9.5 5.55228 9.5 5V4C9.5 3.44772 9.94772 3 10.5 3Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M2.5 8H7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.5 10H7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
MailIcon.displayName = "MailIcon";

export const CamIcon = (props) => (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M3 1H9C10.1046 1 11 1.89543 11 3V7C11 8.10457 10.1046 9 9 9H3C1.89543 9 1 8.10457 1 7V3C1 1.89543 1.89543 1 3 1ZM11 4L13.4 2.2C13.8418 1.86863 14.4686 1.95817 14.8 2.4C14.9298 2.5731 15 2.78363 15 3V7C15 7.55228 14.5523 8 14 8C13.7836 8 13.5731 7.92982 13.4 7.8L11 6V4Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
CamIcon.displayName = "CamIcon";

export const DoorExitIcon = (props) => (
  <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.5 1H10.5C11.6046 1 12.5 1.89543 12.5 3V13C12.5 14.1046 11.6046 15 10.5 15H2.5C1.39543 15 0.5 14.1046 0.5 13V3C0.5 1.89543 1.39543 1 2.5 1Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.2022 15L6.55722 13.0517C5.90639 12.7039 5.5 12.0259 5.5 11.2879V4.71211C5.5 3.97414 5.90639 3.29613 6.55722 2.94826L10.2022 1"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 9C8.05228 9 8.5 8.55228 8.5 8C8.5 7.44772 8.05228 7 7.5 7C6.94772 7 6.5 7.44772 6.5 8C6.5 8.55228 6.94772 9 7.5 9Z"
      fill="currentColor"
    />
  </svg>
);
DoorExitIcon.displayName = "DoorExitIcon";

export const DoorEnterIcon = (props) => (
  <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M7 11L10 8L7 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 8H1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M2 6V2.99208C2 1.89061 2.8906 0.996468 3.99207 0.992099L11.9444 0.960492C13.0489 0.956171 13.9479 1.84804 13.9523 2.9526L13.9921 12.9818C13.9964 14.0863 13.1045 14.9853 12 14.9897C11.9973 14.9897 11.9947 14.9897 11.9921 14.9897H4C2.89543 14.9897 2 14.0943 2 12.9897V10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
DoorEnterIcon.displayName = "DoorEnterIcon";

export const CheckIcon = (props) => (
  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      fill="currentColor"
      d="M13.0593 0.470597C13.3516 0.764002 13.3508 1.23887 13.0574 1.53126L5.0294 9.53126C4.73636 9.82328 4.2622 9.82286 3.96967 9.53033L0.96967 6.53033C0.676777 6.23744 0.676777 5.76256 0.96967 5.46967C1.26256 5.17678 1.73744 5.17678 2.03033 5.46967L4.50093 7.94027L11.9986 0.468744C12.292 0.176363 12.7669 0.177193 13.0593 0.470597Z"
    />
  </svg>
);
CheckIcon.displayName = "CheckIcon";

export const NoConnectionIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 4)"
    >
      <path d="m2.72727273 7.03333352c.83153145-.67721428 1.77549265-1.15192805 2.76464632-1.42414131m4.05036413-.00556707c.99655252.27128439 1.94775872.74785385 2.78498982 1.42970838" />
      <path d="m7.5 8.5.027-8" />
      <path d="m.28636364 4.66666685c1.5285413-1.31742426 3.34019897-2.14638559 5.22503093-2.48688401m4.08697814.02039968c1.84534719.35249472 3.61641569 1.17465617 5.11526399 2.46648433m-9.57954579 4.73999982c.16101236-.11184953.32823746-.21100517.50026542-.29746717m3.70520939-.01635045c.18361827.09024549.36190455.19485144.53316189.31381785" />
      <circle cx="7.5" cy="11.5" fill="currentColor" r="1" />
    </g>
  </svg>
);
NoConnectionIcon.displayName = "NoConnectionIcon";

export const WriteIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 3)"
    >
      <path d="m14 1c.8284271.82842712.8284271 2.17157288 0 3l-9.5 9.5-4 1 1-3.9436508 9.5038371-9.55252193c.7829896-.78700064 2.0312313-.82943964 2.864366-.12506788z" />
      <path d="m6.5 14.5h8" />
      <path d="m12.5 3.5 1 1" />
    </g>
  </svg>
);
WriteIcon.displayName = "WriteIcon";

export const OpenIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(7 5)"
    >
      <path d="m.5 3.5 3-3 3 3" />
      <path d="m.5 8.5 3 3 3-3" />
    </g>
  </svg>
);
OpenIcon.displayName = "OpenIcon";

export const JoinIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(7 6)"
    >
      <path d="m.5 9.5 3-3 3 3" />
      <path d="m.5.5 3 3 3-3" />
    </g>
  </svg>
);
JoinIcon.displayName = "JoinIcon";

export const GearIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 3)"
    >
      <path
        d="m7.5.5c.35132769 0 .69661025.02588228 1.03404495.07584411l.50785434 1.53911115c.44544792.12730646.86820077.30839026 1.26078721.53578009l1.4600028-.70360861c.5166435.39719686.9762801.86487779 1.3645249 1.388658l-.7293289 1.44720284c.2201691.39604534.3936959.82158734.5131582 1.2692035l1.5298263.5338186c.0390082.29913986.0591302.60421522.0591302.91399032 0 .35132769-.0258823.69661025-.0758441 1.03404495l-1.5391112.50785434c-.1273064.44544792-.3083902.86820077-.5357801 1.26078721l.7036087 1.4600028c-.3971969.5166435-.8648778.9762801-1.388658 1.3645249l-1.4472029-.7293289c-.39604532.2201691-.82158732.3936959-1.26920348.5131582l-.5338186 1.5298263c-.29913986.0390082-.60421522.0591302-.91399032.0591302-.35132769 0-.69661025-.0258823-1.03404495-.0758441l-.50785434-1.5391112c-.44544792-.1273064-.86820077-.3083902-1.26078723-.5357801l-1.46000277.7036087c-.51664349-.3971969-.97628006-.8648778-1.36452491-1.388658l.72932886-1.4472029c-.2203328-.39633993-.39395403-.82222042-.51342462-1.27020241l-1.52968981-.53381682c-.03892294-.29882066-.05900023-.60356226-.05900023-.91299317 0-.35132769.02588228-.69661025.07584411-1.03404495l1.53911115-.50785434c.12730646-.44544792.30839026-.86820077.53578009-1.26078723l-.70360861-1.46000277c.39719686-.51664349.86487779-.97628006 1.388658-1.36452491l1.44720284.72932886c.39633995-.2203328.82222044-.39395403 1.27020243-.51342462l.53381682-1.52968981c.29882066-.03892294.60356226-.05900023.91299317-.05900023z"
        strokeWidth=".933"
      />
      <circle cx="7.5" cy="7.5" r="3" />
    </g>
  </svg>
);
GearIcon.displayName = "GearIcon";

export const CircleIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="10.5" cy="10.5" fill="none" r="8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
CircleIcon.displayName = "CircleIcon";

export const CheckCircleIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(2 2)"
    >
      <circle cx="8.5" cy="8.5" r="8" />
      <path d="m5.5 9.5 2 2 5-5" />
    </g>
  </svg>
);
CheckCircleIcon.displayName = "CheckCircleIcon";

export const BoxIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m2.5.5h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2v-10c0-1.1045695.8954305-2 2-2z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 3)"
    />
  </svg>
);
BoxIcon.displayName = "BoxIcon";

export const CheckBoxIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 3)"
    >
      <path d="m2.5.5h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2v-10c0-1.1045695.8954305-2 2-2z" />
      <path d="m4.5 7.5 2 2 4-4" />
    </g>
  </svg>
);
CheckBoxIcon.displayName = "CheckBoxIcon";

export const PDFIcon = ({ height, width, ...props }) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(4 3)"
    >
      <path d="m12.5 12.5v-7l-5-5h-5c-1.1045695 0-2 .8954305-2 2v10c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2z" />
      <path d="m2.5 7.5h5" />
      <path d="m2.5 9.5h7" />
      <path d="m2.5 11.5h3" />
      <path d="m7.5.5v3c0 1.1045695.8954305 2 2 2h3" />
    </g>
  </svg>
);
PDFIcon.displayName = "PDFIcon";

export const ArticleIcon = ({ height, width, ...props }) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(4 3)"
    >
      <g>
        <path d="m12.5 12.5v-10c0-1.1045695-.8954305-2-2-2h-8c-1.1045695 0-2 .8954305-2 2v10c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2z" />
        <path d="m3.5 4.5h6" />
        <path d="m3.5 7.5h6" />
        <path d="m3.5 10.5h6" />
      </g>
      <g>
        <path d="m12.5 12.5v-10c0-1.1045695-.8954305-2-2-2h-8c-1.1045695 0-2 .8954305-2 2v10c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2z" />
        <path d="m3.5 4.5h6" />
        <path d="m3.5 7.5h6" />
        <path d="m3.5 10.5h6" />
      </g>
    </g>
  </svg>
);
ArticleIcon.displayName = "ArticleIcon";

export const DocumentStackIcon = ({ height, width, strokeWidth, ...props }) => (
  <svg
    viewBox="0 0 21 21"
    height={height || width || 21}
    width={width || 21}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(1 2)"
      strokeWidth={strokeWidth || 1}
    >
      <path d="m16.5 12.5v-10c0-1.1045695-.8954305-2-2-2h-8c-1.1045695 0-2 .8954305-2 2v10c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2z" />
      <path d="m4.30542777 2.93478874-2.00419132.72946598c-1.03795581.37778502-1.57312998 1.52546972-1.19534496 2.56342553l3.42020143 9.39692625c.37778502 1.0379558 1.52546972 1.5731299 2.56342553 1.1953449l5.56843115-2.1980811" />
      <path d="m7.5 5.5h5" />
      <path d="m7.5 7.5h6" />
      <path d="m7.5 9.5h3" />
    </g>
  </svg>
);
DocumentStackIcon.displayName = "DocumentStackIcon";

export const DownloadIcon = (props) => (
  <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6.5 11L10.5 15.232L14.5 11.041" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 4V15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 18H16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
DownloadIcon.displayName = "DownloadIcon";

export const ClipboardIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg">
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(4 3)"
    >
      <path d="m3.5 1.5c-.42139382 0-1.08806048 0-2 0-.55228475 0-1 .44771525-1 1v11c0 .5522848.44771525 1 1 1h10c.5522847 0 1-.4477152 1-1v-11c0-.55228475-.4477153-1-1-1-.8888889 0-1.55555556 0-2 0" />
      <path d="m4.5.5h4c.55228475 0 1 .44771525 1 1s-.44771525 1-1 1h-4c-.55228475 0-1-.44771525-1-1s.44771525-1 1-1z" />
      <path d="m6.5 5.5v6.056" />
      <path d="m6.5 5.5v6" transform="matrix(0 1 -1 0 15 2)" />
    </g>
  </svg>
);
ClipboardIcon.displayName = "ClipboardIcon";

export const DirectionIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.5 4.5H15.5L17.5 6.5L15.5 8.5H4.5C3.94772 8.5 3.5 8.05228 3.5 7.5V5.5C3.5 4.94772 3.94772 4.5 4.5 4.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16.5 11.5H5.5L3.5 13.5L5.5 15.5H16.5C17.0523 15.5 17.5 15.0523 17.5 14.5V12.5C17.5 11.9477 17.0523 11.5 16.5 11.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10.5 8.5V11.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 15.5V18.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
DirectionIcon.displayName = "DirectionIcon";

export const AeroplaneIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(1 2)"
    >
      <path d="m.5 7 16-6.535-2.8 14.535z" />
      <path d="m16.5.5-11 10" />
      <path d="m5.5 10.5v5l3-3" />
    </g>
  </svg>
);
AeroplaneIcon.displayName = "AeroplaneIcon";

export const RightPaneIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.5 3.5H14.5C15.6046 3.5 16.5 4.39543 16.5 5.5V15.5C16.5 16.6046 15.6046 17.5 14.5 17.5H6.5C5.39543 17.5 4.5 16.6046 4.5 15.5V5.5C4.5 4.39543 5.39543 3.5 6.5 3.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8.5 17.5V3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
RightPaneIcon.displayName = "RightPaneIcon";

export const LeftPaneIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.5 17.5L6.5 17.5C5.39543 17.5 4.5 16.6046 4.5 15.5L4.5 5.5C4.5 4.39543 5.39543 3.5 6.5 3.5L14.5 3.5C15.6046 3.5 16.5 4.39543 16.5 5.5L16.5 15.5C16.5 16.6046 15.6046 17.5 14.5 17.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12.5 3.5L12.5 17.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
LeftPaneIcon.displayName = "LeftPaneIcon";

export const DocumentJustifiedIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.5 15.5V5.5C17.5 4.39543 16.4553 3.5 15.1667 3.5H5.83333C4.54467 3.5 3.5 4.39543 3.5 5.5V15.5C3.5 16.6046 4.54467 17.5 5.83333 17.5H15.1667C16.4553 17.5 17.5 16.6046 17.5 15.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6.5 7.5H14.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 10.5H14.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 13.5H14.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
DocumentJustifiedIcon.displayName = "DocumentJustifiedIcon";

export const SplitPlaygroundIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.5 3.5H5.5C4.39543 3.5 3.5 4.7536 3.5 6.3V14.7C3.5 16.2464 4.39543 17.5 5.5 17.5H15.5C16.6046 17.5 17.5 16.2464 17.5 14.7V6.3C17.5 4.7536 16.6046 3.5 15.5 3.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10.5 3.5V17.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
SplitPlaygroundIcon.displayName = "SplitPlaygroundIcon";

export const PlaygroundIcon = ({ height, width, ...props }) => (
  <svg
    viewBox="0 0 21 21"
    height={height || width || 21}
    width={width || 21}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18.5 15V6C18.5 4.89543 17.6046 4 16.5 4H4.5C3.39543 4 2.5 4.89543 2.5 6V15C2.5 16.1046 3.39543 17 4.5 17H16.5C17.6046 17 18.5 16.1046 18.5 15Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.5 14V7C8.5 6.44772 8.05228 6 7.5 6H5.5C4.94772 6 4.5 6.44772 4.5 7V14C4.5 14.5523 4.94772 15 5.5 15H7.5C8.05228 15 8.5 14.5523 8.5 14ZM16.5 8V7C16.5 6.44771 16.0523 6 15.5 6H11.5C10.9477 6 10.5 6.44771 10.5 7V8C10.5 8.55228 10.9477 9 11.5 9H15.5C16.0523 9 16.5 8.55228 16.5 8ZM16.5 14V12C16.5 11.4477 16.0523 11 15.5 11H11.5C10.9477 11 10.5 11.4477 10.5 12V14C10.5 14.5523 10.9477 15 11.5 15H15.5C16.0523 15 16.5 14.5523 16.5 14Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
PlaygroundIcon.displayName = "PlaygroundIcon";

export const ZoomIcon = (props) => (
  <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M8.5 14C11.2614 14 13.5 11.7614 13.5 9C13.5 6.23858 11.2614 4 8.5 4C5.73858 4 3.5 6.23858 3.5 9C3.5 11.7614 5.73858 14 8.5 14Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M17.5 18.0001L12.133 12.6331" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
ZoomIcon.displayName = "ZoomIcon";

export const CalendarIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill="none" fillRule="evenodd" transform="translate(2 2)">
      <path
        d="m2.5.5h12c1.1045695 0 2 .8954305 2 2v12c0 1.1045695-.8954305 2-2 2h-12c-1.1045695 0-2-.8954305-2-2v-12c0-1.1045695.8954305-2 2-2z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m.5 4.5h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="currentColor">
        <circle cx="8.5" cy="8.5" r="1" />
        <circle cx="4.5" cy="8.5" r="1" />
        <circle cx="4.5" cy="12.5" r="1" />
      </g>
    </g>
  </svg>
);
CalendarIcon.displayName = "CalendarIcon";

export const LinkIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" {...props}>
    <g fill="none" fillRule="evenodd" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M1.38757706,5.69087183 C0.839076291,5.14050909 0.5,4.38129902 0.5,3.54289344 C0.5,1.8623496 1.8623496,0.5 3.542893,0.5 L8.457107,0.5 C10.1376504,0.5 11.5,1.86235004 11.5,3.54289344 C11.5,5.22343727 10.1376504,6.5 8.457107,6.5 L6,6.5"
        transform="translate(3 6)"
      />
      <path
        d="M4.38757706,8.69087183 C3.83907629,8.14050909 3.5,7.38129902 3.5,6.54289344 C3.5,4.8623496 4.8623496,3.5 6.542893,3.5 L11.457107,3.5 C13.1376504,3.5 14.5,4.86235004 14.5,6.54289344 C14.5,8.22343727 13.1376504,9.5 11.457107,9.5 L9,9.5"
        transform="translate(3 6) rotate(-180 9 6.5)"
      />
    </g>
  </svg>
);
LinkIcon.displayName = "LinkIcon";

export const UnlinkIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m5.5 8.5c-.39387503 0-.0547637 0-1 0-2.209139 0-4-1.790861-4-4s1.790861-4 4-4h1m4 0h1c2.209139 0 4 1.790861 4 4s-1.790861 4-4 4c-.88888889 0-.55555556 0-1 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 6)"
    />
  </svg>
);
UnlinkIcon.displayName = "UnlinkIcon";

export const ExternalIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 3)"
    >
      <path d="m15.5.5v5h-5" transform="matrix(1 0 0 -1 0 6)" />
      <path d="m12-.95v9.9" transform="matrix(.70710678 .70710678 -.70710678 .70710678 6.343146 -7.313708)" />
      <path d="m7.5.5h-5c-1.1045695 0-2 .8954305-2 2v10c0 1.1045695.8954305 2 2 2h11c1.1045695 0 2-.8954305 2-2v-4" />
    </g>
  </svg>
);
ExternalIcon.displayName = "ExternalIcon";

export const HelpIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M10.5 18.5C14.9183 18.5 18.5 14.9183 18.5 10.5C18.5 6.08172 14.9183 2.5 10.5 2.5C6.08172 2.5 2.5 6.08172 2.5 10.5C2.5 14.9183 6.08172 18.5 10.5 18.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.5 14.5C12.7091 14.5 14.5 12.7091 14.5 10.5C14.5 8.29086 12.7091 6.5 10.5 6.5C8.29086 6.5 6.5 8.29086 6.5 10.5C6.5 12.7091 8.29086 14.5 10.5 14.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M13.5 7.5L16 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 13.5L16 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 13.5L5 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 7.5L5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
HelpIcon.displayName = "HelpIcon";

export const KeyboardIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.32828 15.5H15.4998C16.6044 15.5 17.4998 14.6046 17.4998 13.5V7.5C17.4998 6.39543 16.6044 5.5 15.4998 5.5H8.32828C7.79784 5.5 7.28914 5.71071 6.91406 6.08579L3.20696 9.79289C2.81643 10.1834 2.81643 10.8166 3.20696 11.2071L6.91406 14.9142C7.28914 15.2893 7.79784 15.5 8.32828 15.5V15.5Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9.5 12.5L13.5 8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 8.5L13.5 12.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
KeyboardIcon.displayName = "KeyboardIcon";

export const PinIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M11.0145 14.8087C10.6978 14.6187 10.3022 14.6187 9.9855 14.8087L8.00875 15.9948C7.19127 16.4852 6.2163 15.6623 6.56253 14.7741L7.25848 12.9886C7.40479 12.6132 7.31157 12.1867 7.022 11.9067L5.27698 10.2188C4.63083 9.59379 5.07326 8.5 5.97221 8.5H7.82297C8.23187 8.5 8.59958 8.25105 8.75144 7.87139L9.57152 5.82119C9.90678 4.98305 11.0932 4.98305 11.4285 5.82119L12.2486 7.87139C12.4004 8.25105 12.7681 8.5 13.177 8.5H15.0858C15.9767 8.5 16.4229 9.57714 15.7929 10.2071L13.9663 12.0337C13.6834 12.3166 13.5963 12.7408 13.7449 13.1122L14.3975 14.7439C14.7533 15.6331 13.7759 16.4655 12.9546 15.9727L11.0145 14.8087Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
PinIcon.displayName = "PinIcon";

export const VideoIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(2 5)"
    >
      <path d="m2.49368982.53498937 11.99999998-.03787142c1.0543566-.00331643 1.9207298.80983192 2.0003436 1.84444575l.0059666.15555425v6.00288205c0 1.1045695-.8954305 2-2 2h-12c-1.1045695 0-2-.8954305-2-2v-5.96502059c0-1.10210602.89158929-1.9965128 1.99368982-1.99999004z" />
      <path d="m7.5 7.5 3-2-3-2z" fill="currentColor" />
    </g>
  </svg>
);
VideoIcon.displayName = "VideoIcon";

export const YouTubeIcon = (props) => (
  <svg height="14" viewBox="0 0 159 110" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m154 17.5c-1.82-6.73-7.07-12-13.8-13.8-9.04-3.49-96.6-5.2-122 .1-6.73 1.82-12 7.07-13.8 13.8-4.08 17.9-4.39 56.6.1 74.9 1.82 6.73 7.07 12 13.8 13.8 17.9 4.12 103 4.7 122 0 6.73-1.82 12-7.07 13.8-13.8 4.35-19.5 4.66-55.8-.1-75z"
      fill="#f00"
    />
    <path d="m105 55-40.8-23.4v46.8z" fill="#fff" />
  </svg>
);
YouTubeIcon.displayName = "YouTubeIcon";

export const ReadwiseIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.3156 14.167C14.6741 14.7633 14.9664 14.9615 15.5644 15.0325V15.6288H12.6143L9.85089 11.0171H9.16046V14.0398C9.16046 14.8492 9.36032 14.9615 10.211 15.0325V15.6288H5.75781V15.0325C6.60847 14.9615 6.80834 14.8476 6.80834 14.0398V7.28578C6.80834 6.4632 6.6349 6.3641 5.75781 6.29307V5.69678H10.3415C13.1049 5.69678 14.5485 6.27821 14.5485 8.32144C14.5485 9.8675 13.797 10.6058 12.2823 10.8602L14.3156 14.167ZM12.2442 9.22353C12.2442 9.22353 11.8825 7.19185 12.117 6.76074L9.12402 10.0659C9.85576 9.45808 12.0708 9.44817 12.0708 9.44817C12.1765 9.42504 12.2492 9.33089 12.2442 9.22353Z"
      fill="currentColor"
    />
  </svg>
);
ReadwiseIcon.displayName = "ReadwiseIcon";

export const AppleNotesIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="2.5" y="2.5" width="16" height="16" rx="3.54762" fill="white" />
    <rect x="2.5" y="2.5" width="16" height="16" rx="3.54762" stroke="#333333" />
    <rect width="17" height="1" transform="matrix(1 0 0 -1 2 9)" fill="#333333" />
    <path d="M3 6C3 4.34315 4.34315 3 6 3H15C16.6569 3 18 4.34315 18 6V8H3V6Z" fill="#F9DC6A" />
  </svg>
);
AppleNotesIcon.displayName = "AppleNotesIcon";

export const InstapaperIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M11.9557 14.6636C11.9557 15.621 12.0983 15.7632 13.5 15.87V16.6327H7.5V15.87C8.90328 15.7632 9.04435 15.621 9.04435 14.6636V5.95175C9.04435 5.01272 8.90223 4.85218 7.5 4.74533V4H13.4995V4.74533C12.0983 4.85218 11.9551 5.01167 11.9551 5.95175L11.9557 14.6636Z"
      fill="currentColor"
    />
  </svg>
);
InstapaperIcon.displayName = "InstapaperIcon";

export const PocketIcon = (props) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.5078 4.00012C12.5468 4.00012 14.5855 3.99982 16.6241 4.00076C17.2561 4.00107 17.7992 4.40862 17.9563 5.00085C17.9814 5.09444 17.997 5.19334 17.997 5.29006C17.998 6.883 18.0058 8.47595 17.9914 10.0689C17.9767 11.6966 17.4843 13.1699 16.4827 14.4568C15.3677 15.8885 13.93 16.8316 12.158 17.241C8.0894 18.1814 4.20267 15.5551 3.24327 11.8797C3.11525 11.3898 3.02823 10.8928 3.02416 10.3866C3.00976 8.69225 2.99912 6.99758 3.00006 5.30322C3.00037 4.58954 3.63673 4.00106 4.37984 4.00106C6.42227 3.9995 8.46502 4.00012 10.5078 4.00012ZM10.5103 10.8489C10.4727 10.8136 10.4436 10.7876 10.4158 10.7607C9.50801 9.8886 8.60088 9.01529 7.69188 8.14479C7.59519 8.0503 7.48066 7.97597 7.35497 7.92617C7.22928 7.87637 7.09494 7.85207 6.95977 7.8547C6.8246 7.85732 6.6913 7.88681 6.56764 7.94145C6.44398 7.99609 6.33243 8.07478 6.23947 8.17295C6.14593 8.26944 6.07236 8.38345 6.023 8.50845C5.97365 8.63345 5.94946 8.76697 5.95185 8.90134C5.95423 9.03572 5.98314 9.1683 6.0369 9.29147C6.09067 9.41464 6.16823 9.52597 6.26514 9.61908C7.44334 10.7572 8.62467 11.8919 9.80819 13.0247C10.2026 13.4019 10.8098 13.3978 11.2096 13.0253C11.3698 12.8763 11.526 12.723 11.6838 12.5712C12.6958 11.5986 13.7071 10.6254 14.7201 9.65383C14.9636 9.42064 15.091 9.13861 15.0591 8.80274C15.0184 8.37579 14.793 8.06871 14.3892 7.92128C13.986 7.77479 13.6198 7.86337 13.309 8.16011C12.8 8.64622 12.2935 9.13484 11.7861 9.62252L10.5103 10.8489Z"
      fill="#F43B53"
    />
  </svg>
);
PocketIcon.displayName = "PocketIcon";

export const TwitterIcon = (props) => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_2428_303)">
      <path
        d="M12.5294 3.13729C12.5379 3.25979 12.5379 3.38229 12.5379 3.50592C12.5379 7.27294 9.67017 11.6175 4.42638 11.6175V11.6152C2.87735 11.6175 1.36049 11.1737 0.0564575 10.3371C0.281699 10.3642 0.50807 10.3778 0.735006 10.3783C2.01872 10.3795 3.26573 9.94874 4.27565 9.1556C3.05573 9.13245 1.98597 8.33705 1.61226 7.17584C2.0396 7.25826 2.47993 7.24132 2.89936 7.12673C1.56936 6.85802 0.612506 5.68947 0.612506 4.33237C0.612506 4.31995 0.612506 4.3081 0.612506 4.29624C1.0088 4.51697 1.45251 4.63947 1.90638 4.65302C0.653716 3.81584 0.267587 2.14939 1.02404 0.846484C2.47146 2.62753 4.60702 3.71027 6.89952 3.82487C6.66976 2.83471 6.98364 1.79713 7.72428 1.10108C8.87251 0.0217254 10.6784 0.077048 11.7577 1.22471C12.3962 1.09882 13.0082 0.864548 13.5682 0.532613C13.3553 1.19253 12.9099 1.7531 12.3149 2.10931C12.88 2.04269 13.4321 1.8914 13.952 1.66052C13.5693 2.23406 13.0872 2.73366 12.5294 3.13729Z"
        fill="#1D9BF0"
      />
    </g>
    <defs>
      <clipPath id="clip0_2428_303">
        <rect width="14" height="11.5161" fill="white" transform="translate(0 0.241943)" />
      </clipPath>
    </defs>
  </svg>
);
TwitterIcon.displayName = "TwitterIcon";

export const GoogleDriveIcon = (props) => (
  <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_10443_2201)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.5267 13.0381H21.4979L14.4999 0.903564H7.48218L14.5267 13.0381Z"
        fill="#FFCF63"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.0096 19.0754L21.4952 13.0382L7.4874 13.0313L3.97852 19.1089L18.0096 19.0754Z"
        fill="#2C62DF"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.511255 13.0635L3.99686 19.1007L11.0067 6.97307L7.4978 0.895508L0.511255 13.0635Z"
        fill="#199B4E"
      />
    </g>
    <defs>
      <clipPath id="clip0_10443_2201">
        <rect width="21" height="18.2284" fill="white" transform="translate(0.5 0.885742)" />
      </clipPath>
    </defs>
  </svg>
);
GoogleDriveIcon.displayName = "GoogleDriveIcon";

export const FAQIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m16.5 1.59090909c-1.3333333-.72727273-2.6666667-1.09090909-4-1.09090909s-2.66666667.36363636-4 1.09090909v9.90909091c1.33333333-.6666667 2.6666667-1 4-1s2.6666667.3333333 4 1zm-8 0c-1.33333333-.72727273-2.66666667-1.09090909-4-1.09090909s-2.66666667.36363636-4 1.09090909v9.90909091c1.33333333-.6666667 2.66666667-1 4-1s2.66666667.3333333 4 1z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(2 5)"
    />
  </svg>
);
FAQIcon.displayName = "FAQIcon";

export const AddToClipboardIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(4 3)"
    >
      <path d="m3.5 1.5c-.42139382 0-1.08806048 0-2 0-.55228475 0-1 .44771525-1 1v11c0 .5522848.44771525 1 1 1h10c.5522847 0 1-.4477152 1-1v-11c0-.55228475-.4477153-1-1-1-.8888889 0-1.55555556 0-2 0" />
      <path d="m4.5.5h4c.55228475 0 1 .44771525 1 1s-.44771525 1-1 1h-4c-.55228475 0-1-.44771525-1-1s.44771525-1 1-1z" />
      <path d="m6.5 5.5v6.056" />
      <path d="m6.5 5.5v6" transform="matrix(0 1 -1 0 15 2)" />
    </g>
  </svg>
);
AddToClipboardIcon.displayName = "AddToClipboardIcon";

export const BellNotificationIcon = (props) => (
  <svg fill="none" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g strokeLinecap="round" strokeLinejoin="round">
      <path
        d="m13.4999 17.5c-.6667 1-1.5 1.5-2.5 1.5-1.00004 0-1.83337-.5-2.50004-1.5m7.58454-1.5h-10.16906c-.91166 0-1.65071-.739-1.65071-1.6507 0-.2992.08131-.5928.23523-.8493.98153-1.6359 1.5-3.50774 1.5-5.41548v-1.08452c0-2.20914 1.79086-4 4-4h2.00004c2.2091 0 4 1.79086 4 4v1.08452c0 1.90774.5184 3.77958 1.5 5.41548.469.7817.2155 1.7957-.5662 2.2648-.2566.1539-.5501.2352-.8493.2352z"
        stroke="currentColor"
      />
      <path d="m15 6c1.1046 0 2-.89543 2-2s-.8954-2-2-2-2 .89543-2 2 .8954 2 2 2z" fill="#b94040" stroke="#b94040" />
    </g>
  </svg>
);
BellNotificationIcon.displayName = "BellNotificationIcon";

export const BellIcon = (props) => (
  <svg fill="none" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g strokeLinecap="round" strokeLinejoin="round">
      <path
        d="m13.4999 17.5c-.6667 1-1.5 1.5-2.5 1.5-1.00004 0-1.83337-.5-2.50004-1.5m7.58454-1.5h-10.16906c-.91166 0-1.65071-.739-1.65071-1.6507 0-.2992.08131-.5928.23523-.8493.98153-1.6359 1.5-3.50774 1.5-5.41548v-1.08452c0-2.20914 1.79086-4 4-4h2.00004c2.2091 0 4 1.79086 4 4v1.08452c0 1.90774.5184 3.77958 1.5 5.41548.469.7817.2155 1.7957-.5662 2.2648-.2566.1539-.5501.2352-.8493.2352z"
        stroke="currentColor"
      />
    </g>
  </svg>
);
BellIcon.displayName = "BellIcon";

export const WavesIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m8.5 8.5c0-4.418278-3.581722-8-8-8m5 8c0-2.76142375-2.23857625-5-5-5m2 5c0-1.1045695-.8954305-2-2-2"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(6 6)"
    />
  </svg>
);
WavesIcon.displayName = "WavesIcon";

export const CollapseLeftIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 3)"
    >
      <path d="m.5 12.5v-10c0-1.1045695.8954305-2 2-2h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2z" />
      <path
        d="m2.5 12.5v-10c0-1.1045695.8954305-2 2-2h-2c-1 0-2 .8954305-2 2v10c0 1.1045695 1 2 2 2h2c-1.1045695 0-2-.8954305-2-2z"
        fill="currentColor"
      />
      <path d="m7.5 10.5-3-3 3-3" />
      <path d="m12.5 7.5h-8" />
    </g>
  </svg>
);
CollapseLeftIcon.displayName = "CollapseLeftIcon";

export const CollapseRightIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(3 3)"
    >
      <path d="m.5 12.5v-10c0-1.1045695.8954305-2 2-2h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2z" />
      <path
        d="m12.5 12.5v-10c0-1.1045695-.8954305-2-2-2h2c1 0 2 .8954305 2 2v10c0 1.1045695-1 2-2 2h-2c1.1045695 0 2-.8954305 2-2z"
        fill="currentColor"
      />
      <path d="m7.5 10.5 3-3-3-3" />
      <path d="m10.5 7.5h-8" />
    </g>
  </svg>
);
CollapseRightIcon.displayName = "CollapseRightIcon";

export const ThumbsUpIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      clipRule="evenodd"
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.35732 16.7567 3.14378-1.2567h4v-7h-2l-2.80105-5.5c-.5799 0-1.07488.20503-1.48493.61508s-.61507.90502-.61507 1.48492l.9 2.4-4.03106 1.34369c-.99799.33266-1.55918 1.37581-1.30863 2.37961l.06842.22 1.55364 4.143c.38784 1.0343 1.54066 1.5583 2.5749 1.1704z" />
      <path d="m17.5 7.5h-2c-.5523 0-1 .44772-1 1v8c0 .5523.4477 1 1 1h2c.5523 0 1-.4477 1-1v-8c0-.55228-.4477-1-1-1z" />
    </g>
  </svg>
);
ThumbsUpIcon.displayName = "ThumbsUpIcon";

export const ThumbsDownIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g
      clipRule="evenodd"
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m13.6427 4.24326-3.1438 1.25674h-4v7h2l2.8011 5.5c.5799 0 1.0748-.205 1.4849-.6151.41-.41.6151-.905.6151-1.4849l-.9-2.4 4.031-1.3437c.998-.3326 1.5592-1.3758 1.3086-2.37963l-.0684-.21997-1.5536-4.14303c-.3879-1.03424-1.5407-1.55825-2.5749-1.17041z" />
      <path d="m3.5 13.5h2c.55228 0 1-.4477 1-1v-8c0-.55228-.44772-1-1-1h-2c-.55228 0-1 .44772-1 1v8c0 .5523.44772 1 1 1z" />
    </g>
  </svg>
);
ThumbsDownIcon.displayName = "ThumbsDownIcon";

export const HomeMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M1.5 11.0001L10.5 2.00012L19.5 11.0001"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M3.5 9.00012V16.0001C3.5 17.1047 4.39543 18.0001 5.5 18.0001H15.5C16.6046 18.0001 17.5 17.1047 17.5 16.0001V9.00012"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
HomeMenuIcon.displayName = "HomeMenuIcon";

export const DailyLogMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.5 3.00012H16.5C17.6046 3.00012 18.5 3.89555 18.5 5.00012V17.0001C18.5 18.1047 17.6046 19.0001 16.5 19.0001H4.5C3.39543 19.0001 2.5 18.1047 2.5 17.0001V5.00012C2.5 3.89555 3.39543 3.00012 4.5 3.00012Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2.5 7.00012H18.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M10.5 12.0001C11.0523 12.0001 11.5 11.5524 11.5 11.0001C11.5 10.4478 11.0523 10.0001 10.5 10.0001C9.94772 10.0001 9.5 10.4478 9.5 11.0001C9.5 11.5524 9.94772 12.0001 10.5 12.0001Z"
      fill="currentColor"
    />
    <path
      d="M6.5 12.0001C7.05228 12.0001 7.5 11.5524 7.5 11.0001C7.5 10.4478 7.05228 10.0001 6.5 10.0001C5.94772 10.0001 5.5 10.4478 5.5 11.0001C5.5 11.5524 5.94772 12.0001 6.5 12.0001Z"
      fill="currentColor"
    />
    <path
      d="M6.5 16.0001C7.05228 16.0001 7.5 15.5524 7.5 15.0001C7.5 14.4478 7.05228 14.0001 6.5 14.0001C5.94772 14.0001 5.5 14.4478 5.5 15.0001C5.5 15.5524 5.94772 16.0001 6.5 16.0001Z"
      fill="currentColor"
    />
  </svg>
);
DailyLogMenuIcon.displayName = "DailyLogMenuIcon";

export const PlaygroundsMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18.5 16.0001V7.00012C18.5 5.89555 17.6046 5.00012 16.5 5.00012H4.5C3.39543 5.00012 2.5 5.89555 2.5 7.00012V16.0001C2.5 17.1047 3.39543 18.0001 4.5 18.0001H16.5C17.6046 18.0001 18.5 17.1047 18.5 16.0001Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.5 15.0001V8.00012C8.5 7.44784 8.05228 7.00012 7.5 7.00012H5.5C4.94772 7.00012 4.5 7.44784 4.5 8.00012V15.0001C4.5 15.5524 4.94772 16.0001 5.5 16.0001H7.5C8.05228 16.0001 8.5 15.5524 8.5 15.0001ZM16.5 9.00012V8.00012C16.5 7.44784 16.0523 7.00012 15.5 7.00012H11.5C10.9477 7.00012 10.5 7.44784 10.5 8.00012V9.00012C10.5 9.55241 10.9477 10.0001 11.5 10.0001H15.5C16.0523 10.0001 16.5 9.55241 16.5 9.00012ZM16.5 15.0001V13.0001C16.5 12.4478 16.0523 12.0001 15.5 12.0001H11.5C10.9477 12.0001 10.5 12.4478 10.5 13.0001V15.0001C10.5 15.5524 10.9477 16.0001 11.5 16.0001H15.5C16.0523 16.0001 16.5 15.5524 16.5 15.0001Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
PlaygroundsMenuIcon.displayName = "PlaygroundsMenuIcon";

export const RecallMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#clip0_8229_78)">
      <path
        d="M18.7997 19.43L13.2007 13.8311"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.0547 13.8561C15.5931 11.3177 15.5931 7.2021 13.0547 4.66369C10.5163 2.12529 6.40072 2.12529 3.86231 4.66369C1.3239 7.2021 1.3239 11.3177 3.86231 13.8561C6.40072 16.3945 10.5163 16.3945 13.0547 13.8561Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
    <defs>
      <clipPath id="clip0_8229_78">
        <rect width="21" height="21" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
RecallMenuIcon.displayName = "RecallMenuIcon";

export const LibraryMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M2.5 11.0001L10.5 15.0001L18.517 11.0001"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2.5 15.0001L10.5 19.0001L18.517 15.0001"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.5 7.15712L10.508 11.0001L18.517 7.15712L10.508 3.00012L2.5 7.15712Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
LibraryMenuIcon.displayName = "LibraryMenuIcon";

export const SubscriptionsMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M17 17.0001C17 10.3727 11.6274 5.00012 5 5.00012M12.5 17.0001C12.5 12.858 9.14214 9.50012 5 9.50012M8 17.0001C8 15.3433 6.65685 14.0001 5 14.0001"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
SubscriptionsMenuIcon.displayName = "SubscriptionsMenuIcon";

export const IntegrationsMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M10.5 8.2999H16.1678L9.36645 18.4985V11.7006H4.83221L7.09933 1.49854H12.7671L10.5 8.2999Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
IntegrationsMenuIcon.displayName = "IntegrationsMenuIcon";

export const SettingsMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.5 2.50012C10.9266 2.50012 11.3459 2.53155 11.7556 2.59222L12.3723 4.46114C12.9132 4.61573 13.4266 4.83561 13.9033 5.11173L15.6761 4.25735C16.3035 4.73966 16.8616 5.30756 17.333 5.94357L16.4474 7.70089C16.7148 8.1818 16.9255 8.69853 17.0706 9.24207L18.9282 9.89028C18.9756 10.2535 19 10.624 19 11.0001C19 11.4267 18.9686 11.846 18.9079 12.2557L17.039 12.8724C16.8844 13.4133 16.6645 13.9267 16.3884 14.4034L17.2428 16.1762C16.7605 16.8036 16.1926 17.3617 15.5565 17.8332L13.7992 16.9476C13.3183 17.2149 12.8016 17.4256 12.2581 17.5707L11.6098 19.4283C11.2466 19.4757 10.8762 19.5001 10.5 19.5001C10.0734 19.5001 9.65412 19.4687 9.24437 19.408L8.62769 17.5391C8.08679 17.3845 7.57345 17.1646 7.09674 16.8885L5.32388 17.7429C4.69652 17.2606 4.13839 16.6927 3.66695 16.0567L4.55257 14.2994C4.28502 13.8181 4.0742 13.3009 3.92912 12.757L2.07164 12.1088C2.02438 11.7459 2 11.3759 2 11.0001C2 10.5735 2.03143 10.1542 2.0921 9.7445L3.96102 9.12782C4.1156 8.58691 4.33549 8.07357 4.61161 7.59686L3.75723 5.824C4.23954 5.19665 4.80743 4.63852 5.44345 4.16708L7.20077 5.05269C7.68204 4.78514 8.19918 4.57432 8.74316 4.42925L9.39137 2.57177C9.75422 2.5245 10.1243 2.50012 10.5 2.50012Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M10.5 14.643C12.5119 14.643 14.1429 13.0121 14.1429 11.0002C14.1429 8.98826 12.5119 7.3573 10.5 7.3573C8.48814 7.3573 6.85718 8.98826 6.85718 11.0002C6.85718 13.0121 8.48814 14.643 10.5 14.643Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
SettingsMenuIcon.displayName = "SettingsMenuIcon";

export const NotificationsMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M13.0001 17.5C12.3334 18.5 11.5001 19 10.5001 19C9.50011 19 8.66677 18.5 8.00011 17.5M15.5846 16H5.41558C4.50392 16 3.76487 15.261 3.76487 14.3493C3.76487 14.0501 3.84618 13.7565 4.00011 13.5C4.98163 11.8641 5.50011 9.99226 5.50011 8.08452V7C5.50011 4.79086 7.29097 3 9.50011 3H11.5001C13.7092 3 15.5001 4.79086 15.5001 7V8.08452C15.5001 9.99226 16.0186 11.8641 17.0001 13.5C17.4692 14.2817 17.2157 15.2957 16.4339 15.7648C16.1774 15.9187 15.8838 16 15.5846 16Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
NotificationsMenuIcon.displayName = "NotificationsMenuIcon";

export const NotificationsActiveMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M13.0001 17.5C12.3334 18.5 11.5001 19 10.5001 19C9.50011 19 8.66677 18.5 8.00011 17.5M15.5846 16H5.41558C4.50392 16 3.76487 15.261 3.76487 14.3493C3.76487 14.0501 3.84618 13.7565 4.00011 13.5C4.98163 11.8641 5.50011 9.99226 5.50011 8.08452V7C5.50011 4.79086 7.29097 3 9.50011 3H11.5001C13.7092 3 15.5001 4.79086 15.5001 7V8.08452C15.5001 9.99226 16.0186 11.8641 17.0001 13.5C17.4692 14.2817 17.2157 15.2957 16.4339 15.7648C16.1774 15.9187 15.8838 16 15.5846 16Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="m15 6c1.1046 0 2-.89543 2-2s-.8954-2-2-2-2 .89543-2 2 .8954 2 2 2z" fill="#b94040" stroke="#b94040" />
    </g>
  </svg>
);
NotificationsActiveMenuIcon.displayName = "NotificationsActiveMenuIcon";

export const HelpMenuIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M10.5 19C14.9183 19 18.5 15.4183 18.5 11C18.5 6.58172 14.9183 3 10.5 3C6.08172 3 2.5 6.58172 2.5 11C2.5 15.4183 6.08172 19 10.5 19Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M10.5 15C12.7091 15 14.5 13.2091 14.5 11C14.5 8.79086 12.7091 7 10.5 7C8.29086 7 6.5 8.79086 6.5 11C6.5 13.2091 8.29086 15 10.5 15Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M13.5 8L16 5.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M13.5 14L16 16.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M7.5 14L5 16.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M7.5 8L5 5.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
HelpMenuIcon.displayName = "HelpMenuIcon";

export const FiltersIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M14.5 18.5V2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M14.5 16.5C15.8807 16.5 17 15.3807 17 14C17 12.6193 15.8807 11.5 14.5 11.5C13.1193 11.5 12 12.6193 12 14C12 15.3807 13.1193 16.5 14.5 16.5Z"
      fill="white"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6.5 18.5V2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M6.5 9.5C7.88071 9.5 9 8.38071 9 7C9 5.61929 7.88071 4.5 6.5 4.5C5.11929 4.5 4 5.61929 4 7C4 8.38071 5.11929 9.5 6.5 9.5Z"
      fill="white"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
FiltersIcon.displayName = "FiltersIcon";

export const DownloadsIcon = (props) => (
  <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="m8.5.5c2.7614237 0 5 2.23857625 5 5 0 .48543539-.0691781.95471338-.1982137 1.39851335.3339576-.25026476.748773-.39851335 1.1982137-.39851335 1.1045695 0 2 .8954305 2 2s-.8954305 2-2 2c-1.104407 0-10.16182706 0-11 0-1.65685425 0-3-1.34314575-3-3s1.34314575-3 3-3c.03335948 0 .06659179.00054449.09968852.00162508.46264217-2.28304993 2.48077946-4.00162508 4.90031148-4.00162508z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(2 5)"
    />
  </svg>
);
DownloadsIcon.displayName = "DownloadsIcon";
