// ============================================================
// Shared TypeScript Types — NPA Digital Twin Dashboard
// Source of Truth: datadirectory.md
// ============================================================

export type QualityFlag = 'GOOD' | 'BAD' | 'UNCERTAIN';
export type AssetStatus = 'GOOD' | 'ALARM' | 'TRIP' | 'OFFLINE' | 'UNKNOWN';

export interface Asset {
  asset_id: string;
  tag: string;
  name: string;
  type: string;
  subtype: string;
  parent_id: string;
  area: string;
  location: string;
  manufacturer: string;
  model: string;
  install_date: string;
  status: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SensorMetadata {
  sensor_id: string;
  asset_id: string;
  tag: string;
  name: string;
  sensor_type: string;
  unit: string;
  normal_min: number;
  normal_max: number;
  alarm_low: number;
  alarm_high: number;
  trip_low: number;
  trip_high: number;
  area: string;
  location: string;
}

export interface TimeseriesRow {
  timestamp: string;
  sensor_id: string;
  asset_id: string;
  sensor_type: string;
  value: number;
  unit: string;
  quality_flag: QualityFlag;
}

export interface MaintenanceHistory {
  work_order_id: string;
  failure_event_id: string;
  asset_id: string;
  tag: string;
  area: string;
  work_order_type: string;
  priority: string;
  status: string;
  raised_date: string;
  scheduled_date: string;
  completed_date: string;
  reported_by: string;
  assigned_to: string;
  supervisor: string;
  work_description: string;
  findings: string;
  actions_taken: string;
  parts_replaced: string;
  labor_hours: number;
  downtime_hours: number;
  production_loss_bbl: number;
  scenario_id: string;
}

export interface FailureEvent {
  failure_event_id: string;
  scenario_id: string;
  asset_id: string;
  tag: string;
  area: string;
  event_timestamp: string;
  detected_by: string;
  severity: string;
  safety_impact: string;
  failure_mode: string;
  root_cause: string;
  failure_mechanism: string;
  immediate_action: string;
  corrective_action: string;
  production_loss_bbl: number;
  downtime_hours: number;
}

export interface DigitalTwinAsset {
  id: string;
  position: { x: number; y: number; z?: number };
  dimensions?: { width: number; height: number; depth: number };
  rotation?: { x: number; y: number; z: number };
}

export interface LiveSensorReading {
  sensor_id: string;
  asset_id: string;
  value: number;
  unit: string;
  quality_flag: QualityFlag;
  status: AssetStatus;
  sensor_type: string;
  timestamp: string;
}

export interface AssetHealth {
  asset_id: string;
  name: string;
  status: AssetStatus;
  sensors: LiveSensorReading[];
  lastMaintenance?: string;
  lubricationDaysOverdue?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: string[];
}

export interface ProactiveAlert {
  id: string;
  asset_id: string;
  asset_name: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  message: string;
  value?: number;
  unit?: string;
  threshold?: number;
  cite: string;
  timestamp: Date;
}
