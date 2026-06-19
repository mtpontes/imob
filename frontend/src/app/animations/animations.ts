import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

export const fade = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 }))
  ])
]);

export const modalTrigger = trigger('modalTrigger', [
  transition(':enter', [
    query('.modal-backdrop', [
      style({ opacity: 0 }),
      animate('180ms ease-out', style({ opacity: 1 }))
    ], { optional: true }),
    query('.modal-content', [
      style({ opacity: 0, transform: 'scale(0.96) translateY(12px)' }),
      animate('240ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
    ], { optional: true })
  ]),
  transition(':leave', [
    query('.modal-content', [
      animate('150ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 0, transform: 'scale(0.96) translateY(8px)' }))
    ], { optional: true }),
    query('.modal-backdrop', [
      animate('150ms ease-in', style({ opacity: 0 }))
    ], { optional: true })
  ])
]);

export const dropdownTrigger = trigger('dropdownTrigger', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-6px)', height: 0, overflow: 'hidden' }),
    animate('180ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)', height: '*' }))
  ]),
  transition(':leave', [
    style({ height: '*', overflow: 'hidden' }),
    animate('120ms ease-in', style({ opacity: 0, transform: 'translateY(-6px)', height: 0 }))
  ])
]);

export const listStaggerTrigger = trigger('listStaggerTrigger', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      stagger('30ms', [
        animate('220ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

export const slideInOut = trigger('slideInOut', [
  transition(':enter', [
    style({ opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }),
    animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, height: '*', marginBottom: '*', marginTop: '*', paddingTop: '*', paddingBottom: '*' }))
  ]),
  transition(':leave', [
    style({ overflow: 'hidden' }),
    animate('150ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 0, height: 0, marginBottom: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }))
  ])
]);
