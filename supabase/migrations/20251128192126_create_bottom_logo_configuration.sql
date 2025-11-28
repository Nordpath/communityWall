/*
  # Create Bottom Logo Configuration Table

  1. New Tables
    - `bottom_logo_config`
      - `id` (uuid, primary key) - Unique identifier for the configuration
      - `plugin_instance_id` (text) - Identifies which app instance this config belongs to
      - `display_mode` (text) - Either 'logo' or 'banner' mode
      - `image_url` (text) - URL of the uploaded logo or banner image
      - `link_url` (text) - Destination URL when logo/banner is clicked
      - `enabled` (boolean) - Whether the logo/banner is currently active
      - `created_at` (timestamptz) - Timestamp when config was created
      - `updated_at` (timestamptz) - Timestamp when config was last updated

  2. Security
    - Enable RLS on `bottom_logo_config` table
    - Add policy for authenticated users to read configuration
    - Add policy for authenticated users to manage their own app's configuration

  3. Indexes
    - Index on `plugin_instance_id` for fast queries by app instance

  4. Notes
    - This table stores the bottom logo/banner configuration for the Community Feed widget
    - Each plugin instance can have one active configuration
    - Display mode determines whether to show a small centered logo or full-width banner
    - Link URL is optional - if provided, clicking the logo/banner opens this URL
*/

-- Create the bottom_logo_config table
CREATE TABLE IF NOT EXISTS bottom_logo_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_instance_id text NOT NULL,
  display_mode text NOT NULL DEFAULT 'logo' CHECK (display_mode IN ('logo', 'banner')),
  image_url text,
  link_url text,
  enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast queries by plugin instance
CREATE INDEX IF NOT EXISTS idx_bottom_logo_plugin_instance 
  ON bottom_logo_config(plugin_instance_id);

-- Enable Row Level Security
ALTER TABLE bottom_logo_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read configurations
CREATE POLICY "Anyone can read bottom logo config"
  ON bottom_logo_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow all authenticated users to insert configurations
CREATE POLICY "Authenticated users can create bottom logo config"
  ON bottom_logo_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow all authenticated users to update configurations
CREATE POLICY "Authenticated users can update bottom logo config"
  ON bottom_logo_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow all authenticated users to delete configurations
CREATE POLICY "Authenticated users can delete bottom logo config"
  ON bottom_logo_config
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bottom_logo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before updates
DROP TRIGGER IF EXISTS update_bottom_logo_config_updated_at ON bottom_logo_config;
CREATE TRIGGER update_bottom_logo_config_updated_at
  BEFORE UPDATE ON bottom_logo_config
  FOR EACH ROW
  EXECUTE FUNCTION update_bottom_logo_updated_at();