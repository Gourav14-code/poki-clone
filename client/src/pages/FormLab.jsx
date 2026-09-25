import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Send,
  FileCheck
} from 'lucide-react';
import TestHint from '../components/TestHint';

export default function FormLab() {
  // Form State
  const initialFormState = {
    fullName: '',
    email: '',
    password: '',
    age: '25',
    phone: '',
    bio: '',
    agreeTerms: false,
    interests: ['Automation'],
    experience: 'intermediate',
    country: 'US',
    languages: ['JavaScript'],
    birthDate: '1995-05-15',
    favoriteColor: '#4f46e5',
    skillLevel: 75
  };

  const [formData, setFormData] = useState(initialFormState);
  const [submittedData, setSubmittedData] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Custom Combobox State
  const frameworkOptions = ['Playwright', 'Cypress', 'Selenium WebDriver', 'Robot Framework', 'Puppeteer', 'Appium'];
  const [selectedFramework, setSelectedFramework] = useState('Playwright');
  const [frameworkSearch, setFrameworkSearch] = useState('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Checkbox group handling
  const allInterests = ['Web Testing', 'API Testing', 'Automation', 'Performance', 'AI Tools'];
  const isAllInterestsSelected = allInterests.every((item) => formData.interests.includes(item));

  const handleSelectAllInterests = (e) => {
    if (e.target.checked) {
      setFormData({ ...formData, interests: [...allInterests] });
    } else {
      setFormData({ ...formData, interests: [] });
    }
  };

  const handleInterestToggle = (item) => {
    const exists = formData.interests.includes(item);
    const updated = exists
      ? formData.interests.filter((i) => i !== item)
      : [...formData.interests, item];
    setFormData({ ...formData, interests: updated });
  };

  const handleLanguageMultiSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData({ ...formData, languages: selected });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full Name is required.';
    if (!formData.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Valid email is required.';
    }
    if (!formData.agreeTerms) errors.agreeTerms = 'You must accept the terms.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setSubmittedData({
        ...formData,
        preferredFramework: selectedFramework,
        submittedAt: new Date().toISOString()
      });
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setSelectedFramework('Playwright');
    setSubmittedData(null);
    setFormErrors({});
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    const data = new FormData();
    data.append('file', selectedFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (res.ok) {
        setUploadStatus({ success: true, details: result.file });
      } else {
        setUploadStatus({ success: false, error: result.error || 'Upload failed' });
      }
    } catch {
      setUploadStatus({ success: false, error: 'Network error uploading file.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Form Controls & File Transfer Lab</h1>
          <TestHint
            testId="form-lab-header"
            tip="Test text input, dropdowns, multi-select, checkboxes (group + master toggle), radio buttons, range slider, file upload and file download."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Complete practice suite for all standard and rich HTML5 form elements with full validation and file transfer.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* Section 1: Text Inputs */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>1. Text & Numeric Inputs</span>
                <TestHint testId="section-text-inputs" />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullname" className="block text-xs font-semibold text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    data-testid="input-fullname"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Jane Doe"
                    className={`mt-1 w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                      formErrors.fullName ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.fullName && (
                    <span data-testid="error-fullname" className="text-xs text-rose-500 mt-1 block">
                      {formErrors.fullName}
                    </span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    data-testid="input-email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@example.com"
                    className={`mt-1 w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                      formErrors.email ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.email && (
                    <span data-testid="error-email" className="text-xs text-rose-500 mt-1 block">
                      {formErrors.email}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    data-testid="input-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Age */}
                <div>
                  <label htmlFor="age" className="block text-xs font-semibold text-slate-700">
                    Age (18 - 100)
                  </label>
                  <input
                    type="number"
                    id="age"
                    min="18"
                    max="100"
                    data-testid="input-age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Bio Textarea */}
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <label htmlFor="bio" className="block text-xs font-semibold text-slate-700">
                    Bio / Notes (Max 200 chars)
                  </label>
                  <span data-testid="bio-char-count" className="text-xs text-slate-400 font-mono">
                    {formData.bio.length} / 200
                  </span>
                </div>
                <textarea
                  id="bio"
                  rows={3}
                  maxLength={200}
                  data-testid="input-bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about your automation experience..."
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Section 2: Dropdowns */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>2. Select Dropdowns (Single, Multi, & Custom Combobox)</span>
                <TestHint testId="section-dropdowns" />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Native Single Select */}
                <div>
                  <div className="flex justify-between items-center">
                    <label htmlFor="country-select" className="block text-xs font-semibold text-slate-700">
                      Country (Native Single Select)
                    </label>
                    <TestHint testId="select-country" />
                  </div>
                  <select
                    id="country-select"
                    data-testid="select-country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="IN">India</option>
                    <option value="AU">Australia</option>
                    <option value="JP">Japan</option>
                  </select>
                </div>

                {/* Custom Searchable Combobox */}
                <div className="relative">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700">
                      Automation Framework (Custom Dropdown)
                    </label>
                    <TestHint testId="custom-combobox-trigger" />
                  </div>
                  <button
                    type="button"
                    data-testid="custom-combobox-trigger"
                    onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left flex justify-between items-center focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <span data-testid="selected-framework-label">{selectedFramework}</span>
                    <span className="text-slate-400 text-xs">▼</span>
                  </button>

                  {isComboboxOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1">
                      <input
                        type="text"
                        data-testid="combobox-search-input"
                        placeholder="Search frameworks..."
                        value={frameworkSearch}
                        onChange={(e) => setFrameworkSearch(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 mb-1"
                      />
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {frameworkOptions
                          .filter((f) => f.toLowerCase().includes(frameworkSearch.toLowerCase()))
                          .map((option) => (
                            <div
                              key={option}
                              data-testid={`combobox-option-${option.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => {
                                setSelectedFramework(option);
                                setIsComboboxOpen(false);
                                setFrameworkSearch('');
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                                selectedFramework === option
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>{option}</span>
                              {selectedFramework === option && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Native Multi-Select */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="languages-multiselect" className="block text-xs font-semibold text-slate-700">
                      Languages (Hold Ctrl/Cmd to select multiple)
                    </label>
                    <TestHint testId="select-languages" tip="In Playwright: locator.selectOption(['JavaScript', 'Python'])" />
                  </div>
                  <select
                    multiple
                    id="languages-multiselect"
                    data-testid="select-languages"
                    value={formData.languages}
                    onChange={handleLanguageMultiSelect}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white h-24"
                  >
                    <option value="JavaScript">JavaScript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="C#">C#</option>
                    <option value="Go">Go</option>
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Selected: {formData.languages.join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Checkboxes & Radios */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>3. Checkboxes & Radio Buttons</span>
                <TestHint testId="section-checkbox-radio" />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                {/* Checkbox Group */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700">Testing Interests</label>
                    {/* Master Checkbox */}
                    <label className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="checkbox-select-all"
                        checked={isAllInterestsSelected}
                        onChange={handleSelectAllInterests}
                        className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300"
                      />
                      <span>Select All</span>
                    </label>
                  </div>
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {allInterests.map((interest) => (
                      <label key={interest} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          data-testid={`checkbox-interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                          checked={formData.interests.includes(interest)}
                          onChange={() => handleInterestToggle(interest)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span>{interest}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Radio Buttons */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    Experience Level
                  </label>
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {[
                      { id: 'beginner', label: 'Beginner (< 1 year)' },
                      { id: 'intermediate', label: 'Intermediate (1 - 4 years)' },
                      { id: 'senior', label: 'Senior (5+ years)' },
                      { id: 'disabled_opt', label: 'Lead Architect (Disabled)', disabled: true }
                    ].map((lvl) => (
                      <label
                        key={lvl.id}
                        className={`flex items-center gap-2 text-xs ${
                          lvl.disabled ? 'text-slate-400 cursor-not-allowed' : 'cursor-pointer text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="experience"
                          data-testid={`radio-exp-${lvl.id}`}
                          value={lvl.id}
                          disabled={lvl.disabled}
                          checked={formData.experience === lvl.id}
                          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span>{lvl.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Pickers & Sliders */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>4. HTML5 Pickers & Slider</span>
                <TestHint testId="section-pickers" />
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                {/* Date Picker */}
                <div>
                  <label htmlFor="birthdate" className="block text-xs font-semibold text-slate-700">
                    Date Picker
                  </label>
                  <input
                    type="date"
                    id="birthdate"
                    data-testid="input-date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label htmlFor="favcolor" className="block text-xs font-semibold text-slate-700">
                    Favorite Color
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      id="favcolor"
                      data-testid="input-color"
                      value={formData.favoriteColor}
                      onChange={(e) => setFormData({ ...formData, favoriteColor: e.target.value })}
                      className="w-10 h-10 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-slate-50"
                    />
                    <span data-testid="color-hex-label" className="text-xs font-mono text-slate-600 uppercase">
                      {formData.favoriteColor}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <div>
                  <div className="flex justify-between items-center">
                    <label htmlFor="skilllevel" className="block text-xs font-semibold text-slate-700">
                      Skill Score
                    </label>
                    <span data-testid="range-slider-value" className="text-xs font-bold text-indigo-600 font-mono">
                      {formData.skillLevel}%
                    </span>
                  </div>
                  <input
                    type="range"
                    id="skilllevel"
                    min="0"
                    max="100"
                    step="5"
                    data-testid="input-range-slider"
                    value={formData.skillLevel}
                    onChange={(e) => setFormData({ ...formData, skillLevel: parseInt(e.target.value, 10) })}
                    className="mt-2 w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  id="agree-terms"
                  data-testid="checkbox-terms"
                  checked={formData.agreeTerms}
                  onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>I agree to the terms and automation conditions *</span>
              </label>
              {formErrors.agreeTerms && (
                <span data-testid="error-terms" className="text-xs text-rose-500 mt-1 block">
                  {formErrors.agreeTerms}
                </span>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                data-testid="form-submit-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Form</span>
              </button>

              <button
                type="button"
                data-testid="form-reset-btn"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Fields</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar: File Transfer & Download (1 col) */}
        <div className="space-y-6">
          {/* File Upload Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>File Upload Test</span>
              </h3>
              <TestHint testId="file-upload-input" tip="In Playwright: setInputFiles('input[type=file]', 'path/to/file')" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload any text or image file. The backend Express API receives the file via <code className="text-indigo-600">multipart/form-data</code> and returns size and mime type.
            </p>

            <form onSubmit={handleFileUpload} className="space-y-3">
              <input
                type="file"
                data-testid="file-upload-input"
                id="file-upload-input"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />

              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                data-testid="file-upload-submit-btn"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? 'Uploading...' : 'Upload File to Server'}
              </button>
            </form>

            {uploadStatus && (
              <div
                data-testid="upload-result-box"
                className={`p-3 rounded-xl border text-xs ${
                  uploadStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {uploadStatus.success ? (
                  <div>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Upload Succeeded!</span>
                    </div>
                    <p className="text-[11px]">Name: <span className="font-mono">{uploadStatus.details.originalName}</span></p>
                    <p className="text-[11px]">Size: <span className="font-mono">{uploadStatus.details.size} bytes</span></p>
                    <p className="text-[11px]">MIME: <span className="font-mono">{uploadStatus.details.mimetype}</span></p>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold">Upload Failed:</span> {uploadStatus.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File Download Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>File Download Test</span>
              </h3>
              <TestHint testId="download-txt-btn" tip="In Playwright: const download = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-txt-btn').click()]);" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Test browser download managers and file assertion handlers with real downloadable files.
            </p>

            <div className="space-y-2">
              <a
                href="/api/download/test-file.txt"
                download="test-file.txt"
                data-testid="download-txt-btn"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                <span>Download Sample .TXT</span>
                <span className="font-mono text-[10px] text-slate-400">test-file.txt</span>
              </a>

              <a
                href="/api/download/sample-data.csv"
                download="sample-data.csv"
                data-testid="download-csv-btn"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                <span>Download Sample .CSV</span>
                <span className="font-mono text-[10px] text-slate-400">sample-data.csv</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Preview Card */}
      {submittedData && (
        <div
          data-testid="form-submission-output"
          className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-bold text-base">Form Submitted Successfully!</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Payload Captured
            </span>
          </div>
          <pre
            data-testid="form-payload-json"
            className="text-xs font-mono bg-slate-950 p-4 rounded-xl text-emerald-300 overflow-x-auto"
          >
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

