'use client';

import React from 'react';
import { SolarIcon } from './SolarIcon';
import { useDoctorAuthUrls } from '../lib/urls';

/**
 * Homepage strip for healthcare professionals: one primary action (register) with sign-in as a
 * quiet link beneath it. Both go straight to the doctor portal's own pages.
 */
export function DoctorsBandSection() {
  const { register, login } = useDoctorAuthUrls();

  return (
    <section className="doctors-band" id="for-doctors" aria-labelledby="doctors-band-title">
      <div className="doctors-band-container">
        <div className="doctors-band-inner">
          <div className="doctors-band-intro">
            <div className="doctors-band-eyebrow">
              <SolarIcon name="stethoscope-bold" size={16} color="currentColor" />
              <span>For doctors</span>
            </div>
            <h2 id="doctors-band-title" className="doctors-band-title">
              Are you a doctor? Join Chekup247.
            </h2>
            <p className="doctors-band-text">
              See patients online on your own schedule, with scheduling, consultations and prescriptions handled in one place.
            </p>
          </div>

          <div className="doctors-band-cta">
            <a href={register} className="doctors-band-btn">
              <span>Join as a doctor</span>
              <SolarIcon name="arrow-right-linear" size={18} color="currentColor" />
            </a>
            <p className="doctors-band-signin">
              Already registered? <a href={login}>Doctor sign in</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
