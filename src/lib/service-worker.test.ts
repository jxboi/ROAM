import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useServiceWorker } from './service-worker';
import { stubLocationReload } from '../test/location';

class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing';
  postMessage = vi.fn();
  advanceTo(next: ServiceWorkerState) {
    this.state = next;
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
  update = vi.fn();
  startInstalling(worker: FakeWorker) {
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
  }
}

function fakeContainer(registration: FakeRegistration | Promise<never>, controller: unknown = null) {
  const container = Object.assign(new EventTarget(), {
    controller,
    register: vi.fn(() => (registration instanceof FakeRegistration ? Promise.resolve(registration) : registration)),
  });
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
  return container;
}

let locationStub: ReturnType<typeof stubLocationReload>;

beforeEach(() => {
  vi.stubEnv('PROD', true);
  locationStub = stubLocationReload();
});

afterEach(() => {
  locationStub.restore();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('service worker registration', () => {
  it('does nothing where service workers are unavailable', () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    const { result } = renderHook(() => useServiceWorker());
    expect(result.current.updateReady).toBe(false);
  });

  it('stays quiet during the first install, which is not an update', async () => {
    const registration = new FakeRegistration();
    fakeContainer(registration, null);
    const { result } = renderHook(() => useServiceWorker());
    await waitFor(() => expect(registration.update).not.toHaveBeenCalled());

    const worker = new FakeWorker();
    act(() => {
      registration.startInstalling(worker);
      worker.advanceTo('installed');
    });
    expect(result.current.updateReady).toBe(false);
  });

  it('offers the update once a newer worker has installed behind the running one', async () => {
    const registration = new FakeRegistration();
    fakeContainer(registration, new FakeWorker());
    const { result } = renderHook(() => useServiceWorker());
    await waitFor(() => expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js'));

    const worker = new FakeWorker();
    act(() => registration.startInstalling(worker));
    expect(result.current.updateReady).toBe(false);

    act(() => worker.advanceTo('installed'));
    await waitFor(() => expect(result.current.updateReady).toBe(true));
  });

  it('offers an update that was already waiting when the page opened', async () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    fakeContainer(registration, new FakeWorker());
    const { result } = renderHook(() => useServiceWorker());
    await waitFor(() => expect(result.current.updateReady).toBe(true));
  });

  it('activates the waiting worker only when asked, then reloads', async () => {
    const registration = new FakeRegistration();
    const waiting = new FakeWorker();
    registration.waiting = waiting;
    const container = fakeContainer(registration, new FakeWorker());
    const { result } = renderHook(() => useServiceWorker());
    await waitFor(() => expect(result.current.updateReady).toBe(true));
    expect(waiting.postMessage).not.toHaveBeenCalled();

    act(() => result.current.applyUpdate());
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(locationStub.reload).not.toHaveBeenCalled();

    container.dispatchEvent(new Event('controllerchange'));
    expect(locationStub.reload).toHaveBeenCalledOnce();
  });

  it('reloads directly when there is nothing waiting to activate', () => {
    fakeContainer(new FakeRegistration(), null);
    const { result } = renderHook(() => useServiceWorker());
    act(() => result.current.applyUpdate());
    expect(locationStub.reload).toHaveBeenCalledOnce();
  });

  it('treats a failed registration as a missing extra, not an error', async () => {
    fakeContainer(Promise.reject(new Error('blocked')) as Promise<never>, null);
    const { result } = renderHook(() => useServiceWorker());
    await waitFor(() => expect(result.current.updateReady).toBe(false));
  });

  it('checks for a newer build when the tab comes back into view', async () => {
    const registration = new FakeRegistration();
    fakeContainer(registration, new FakeWorker());
    renderHook(() => useServiceWorker());
    await waitFor(() => expect(navigator.serviceWorker.register).toHaveBeenCalled());

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(registration.update).toHaveBeenCalled());
  });
});
