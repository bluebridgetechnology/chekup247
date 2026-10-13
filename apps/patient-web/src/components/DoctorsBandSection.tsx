'use client';

import React from 'react';
import { SolarIcon } from './SolarIcon';
import { useDoctorAuthUrls } from '../lib/urls';

/**
 * Homepage band for healthcare professionals. Two explicit, separately labelled actions that go straight
 * to the doctor portal's own pages, so a doctor never has to guess which button is theirs.
 */
export function DoctorsBandSection() {
  const { register, login } = useDoctorAuthUrls();

  return (
    <section className="doctors-band" id="for-doctors" aria-labelledby="doctors-band-title">
      <div className="doctors-band-container">
        <div className="doctors-band-card">
          <div className="doctors-band-intro">
            <div className="doctors-band-eyebrow">
              <SolarIcon name="stethoscope-bold" size={16} color="currentColor" />
              <span>For doctors</span>
            </div>
            <h2 id="doctors-band-title" className="doctors-band-title">
              Are you a doctor? Join Chekup247.
            </h2>
            <p className="doctors-band-text">
              See patients online on your own schedule. Doctors sign in and register on their own portal, separate from the patient app.
            </p>
          </div>

          <div className="doctors-band-actions">
            <a href={register} className="doctors-band-action doctors-band-action-primary">
              <span className="doctors-band-action-icon">
                <SolarIcon name="user-plus-bold" size={20} color="currentColor" />
              </span>
              <span className="doctors-band-action-text">
                <strong>Join as a doctor</strong>
                <small>New to Chekup247? Create your doctor account</small>
              </span>
              <SolarIcon name="arrow-right-linear" size={18} color="currentColor" />
            </a>
            <a href={login} className="doctors-band-action doctors-band-action-secondary">
              <span className="doctors-band-action-icon">
                <SolarIcon name="login-2-linear" size={20} color="currentColor" />
              </span>
              <span className="doctors-band-action-text">
                <strong>Doctor sign in</strong>
                <small>Already registered? Go to your doctor portal</small>
              </span>
              <SolarIcon name="arrow-right-linear" size={18} color="currentColor" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
