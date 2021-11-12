import React from 'react';
import { Factory } from 'rosie';
import {
  render, initializeTestStore, screen, fireEvent,
} from '../../setupTest';
import NotificationTrigger from './NotificationTrigger';

describe('Notification Trigger', () => {
  let mockData;
  let getItemSpy;
  let setItemSpy;
  const courseMetadata = Factory.build('courseMetadata');

  beforeEach(async () => {
    await initializeTestStore({ courseMetadata, excludeFetchCourse: true, excludeFetchSequence: true });
    mockData = {
      courseId: courseMetadata.id,
      toggleNotificationTray: () => {},
      isNotificationTrayVisible: () => {},
      notificationStatus: 'inactive',
      setNotificationStatus: () => {},
      upgradeNotificationCurrentState: 'FPDdaysLeft',
    };
    // Jest does not support calls to localStorage, spying on localStorage's prototype directly instead
    getItemSpy = jest.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem');
    setItemSpy = jest.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem');
  });

  afterAll(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('handles onClick event toggling the notification tray', async () => {
    const toggleNotificationTray = jest.fn();
    const testData = {
      ...mockData,
      toggleNotificationTray,
    };
    render(<NotificationTrigger {...testData} />);

    const notificationTrigger = screen.getByRole('button', { name: /Show notification tray/i });
    expect(notificationTrigger).toBeInTheDocument();
    fireEvent.click(notificationTrigger);
    expect(toggleNotificationTray).toHaveBeenCalledTimes(1);
  });

  it('renders notification trigger icon with red dot when notificationStatus is active', async () => {
    const { container } = render(<NotificationTrigger {...mockData} notificationStatus="active" />);
    expect(container).toBeInTheDocument();
    const buttonIcon = container.querySelectorAll('svg');
    expect(buttonIcon).toHaveLength(1);
    expect(screen.getByTestId('notification-dot')).toBeInTheDocument();
  });

  it('renders notification trigger icon WITHOUT red dot 3 seconds later', async () => {
    const { container } = render(<NotificationTrigger {...mockData} notificationStatus="active" />);
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('notification-dot')).toBeInTheDocument();
    jest.useFakeTimers();
    setTimeout(() => {
      expect(localStorage.setItem).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('notification-dot')).not.toBeInTheDocument();
    }, 3000);
    jest.runAllTimers();
  });

  it('renders notification trigger icon WITHOUT red dot within the same phase', async () => {
    const { container } = render(
      <NotificationTrigger
        {...mockData}
        upgradeNotificationCurrentState="sameState"
        upgradeNotificationLastSeen="sameState"
      />,
    );
    expect(container).toBeInTheDocument();
    expect(localStorage.getItem).toHaveBeenCalledWith(`upgradeNotificationLastSeen.${mockData.courseId}`);
    expect(localStorage.getItem(`upgradeNotificationLastSeen.${mockData.courseId}`)).toBe('"sameState"');
    const buttonIcon = container.querySelectorAll('svg');
    expect(buttonIcon).toHaveLength(1);
    expect(screen.queryByRole('notification-dot')).not.toBeInTheDocument();
  });

  // Rendering NotificationTrigger has the effect of calling UpdateUpgradeNotificationLastSeen(),
  // if upgradeNotificationLastSeen is different than upgradeNotificationCurrentState
  // it should update localStorage accordingly
  it('makes the right updates when rendering a new phase from an UpgradeNotification change (before -> after)', async () => {
    const { container } = render(
      <NotificationTrigger
        {...mockData}
        upgradeNotificationLastSeen="before"
        upgradeNotificationCurrentState="after"
      />,
    );
    expect(container).toBeInTheDocument();

    // verify localStorage get/set are called with correct arguments
    expect(localStorage.getItem).toHaveBeenCalledWith(`upgradeNotificationLastSeen.${mockData.courseId}`);
    expect(localStorage.setItem).toHaveBeenCalledWith(`notificationStatus.${mockData.courseId}`, '"active"');
    expect(localStorage.setItem).toHaveBeenCalledWith(`upgradeNotificationLastSeen.${mockData.courseId}`, '"after"');

    // verify localStorage is updated accordingly
    expect(localStorage.getItem(`upgradeNotificationLastSeen.${mockData.courseId}`)).toBe('"after"');
    expect(localStorage.getItem(`notificationStatus.${mockData.courseId}`)).toBe('"active"');
  });
});
