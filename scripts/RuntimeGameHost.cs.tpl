using System;
using System.IO;
using System.Management.Automation;
using System.Management.Automation.Runspaces;
using System.Drawing;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyCompany("Lumorix")]
[assembly: AssemblyProduct("Lumorix Runtime Host")]
[assembly: AssemblyTitle("__ASSEMBLY_TITLE__")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace Lumorix.RuntimeHost
{
    internal static class Program
    {
        private const string GameTitle = "__GAME_TITLE__";
        private const string DeveloperName = "__DEVELOPER_NAME__";
        private const string LaunchScriptFile = "__LAUNCH_SCRIPT__";
        private const string GameIntro = "__GAME_INTRO__";
        private const string StartLabel = "__START_LABEL__";
        private const string FeatureOne = "__FEATURE_ONE__";
        private const string FeatureTwo = "__FEATURE_TWO__";
        private const string FeatureThree = "__FEATURE_THREE__";
        private const string ControlOne = "__CONTROL_ONE__";
        private const string ControlTwo = "__CONTROL_TWO__";
        private const string ControlThree = "__CONTROL_THREE__";
        private const string FooterText = "__FOOTER_TEXT__";
        private const int AccentR = __ACCENT_R__;
        private const int AccentG = __ACCENT_G__;
        private const int AccentB = __ACCENT_B__;

        [STAThread]
        private static int Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool autoStart = false;
            if (args != null)
            {
                for (int index = 0; index < args.Length; index++)
                {
                    if (string.Equals(args[index], "--autostart", StringComparison.OrdinalIgnoreCase))
                    {
                        autoStart = true;
                        break;
                    }
                }
            }

            if (!autoStart && !ShowLaunchScreen())
            {
                return 0;
            }

            string runtimeRoot = AppDomain.CurrentDomain.BaseDirectory;
            string scriptPath = Path.Combine(runtimeRoot, LaunchScriptFile);

            if (!File.Exists(scriptPath))
            {
                return ShowFatalError(
                    "Launch script missing",
                    "Missing launch script:\r\n" + scriptPath
                );
            }

            try
            {
                Environment.CurrentDirectory = runtimeRoot;

                using (Runspace runspace = RunspaceFactory.CreateRunspace())
                {
                    runspace.ApartmentState = ApartmentState.STA;
                    runspace.ThreadOptions = PSThreadOptions.UseCurrentThread;
                    runspace.Open();
                    runspace.SessionStateProxy.Path.SetLocation(runtimeRoot);
                    runspace.SessionStateProxy.SetVariable(
                        "ErrorActionPreference",
                        ActionPreference.Stop
                    );

                    using (PowerShell shell = PowerShell.Create())
                    {
                        shell.Runspace = runspace;
                        shell.AddScript("& '" + EscapePowerShellLiteral(scriptPath) + "'");
                        shell.Invoke();

                        if (shell.HadErrors)
                        {
                            return ShowFatalError(
                                "Launch failed",
                                FormatPowerShellErrors(shell)
                            );
                        }
                    }
                }

                return 0;
            }
            catch (Exception ex)
            {
                return ShowFatalError("Launch failed", ex.ToString());
            }
        }

        private static string EscapePowerShellLiteral(string value)
        {
            return (value ?? string.Empty).Replace("'", "''");
        }

        private static string FormatPowerShellErrors(PowerShell shell)
        {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("The runtime reported one or more errors.");
            builder.AppendLine();

            int shown = 0;
            foreach (ErrorRecord error in shell.Streams.Error)
            {
                builder.AppendLine(error.ToString());
                if (error.Exception != null && !string.IsNullOrWhiteSpace(error.Exception.Message))
                {
                    builder.AppendLine(error.Exception.Message);
                }

                builder.AppendLine();
                shown++;
                if (shown >= 6)
                {
                    break;
                }
            }

            return builder.ToString().TrimEnd();
        }

        private static int ShowFatalError(string caption, string message)
        {
            MessageBox.Show(
                message,
                GameTitle + " - " + caption,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );

            return 1;
        }

        private static bool ShowLaunchScreen()
        {
            using (Form form = new Form())
            {
                Color background = Color.FromArgb(8, 12, 21);
                Color backgroundDeep = Color.FromArgb(4, 7, 13);
                Color accent = Color.FromArgb(AccentR, AccentG, AccentB);
                Color textPrimary = Color.FromArgb(240, 245, 255);
                Color textMuted = Color.FromArgb(186, 198, 220);

                form.Text = GameTitle;
                form.StartPosition = FormStartPosition.CenterScreen;
                form.ClientSize = new Size(900, 560);
                form.FormBorderStyle = FormBorderStyle.FixedSingle;
                form.MaximizeBox = false;
                form.MinimizeBox = false;
                form.KeyPreview = true;
                form.BackColor = background;

                form.Paint += (sender, args) =>
                {
                    using (LinearGradientBrushEx brush = new LinearGradientBrushEx(
                        form.ClientRectangle,
                        background,
                        backgroundDeep))
                    {
                        args.Graphics.FillRectangle(brush.Brush, form.ClientRectangle);
                    }

                    using (SolidBrush glow = new SolidBrush(Color.FromArgb(38, accent)))
                    {
                        args.Graphics.FillEllipse(glow, -80, -110, 360, 260);
                        args.Graphics.FillEllipse(glow, 560, 300, 280, 220);
                    }

                    using (Pen grid = new Pen(Color.FromArgb(26, accent), 1f))
                    {
                        for (int x = 24; x < form.ClientSize.Width; x += 48)
                        {
                            args.Graphics.DrawLine(grid, x, 0, x - 72, form.ClientSize.Height);
                        }
                    }
                };

                Label eyebrow = new Label();
                eyebrow.Text = DeveloperName + " for Lumorix Arcade";
                eyebrow.ForeColor = accent;
                eyebrow.Font = new Font("Segoe UI", 10f, FontStyle.Bold);
                eyebrow.AutoSize = true;
                eyebrow.BackColor = Color.Transparent;
                eyebrow.Location = new Point(42, 34);
                form.Controls.Add(eyebrow);

                Label title = new Label();
                title.Text = GameTitle;
                title.ForeColor = textPrimary;
                title.Font = new Font("Segoe UI Semibold", 28f, FontStyle.Bold);
                title.AutoSize = false;
                title.Size = new Size(500, 82);
                title.BackColor = Color.Transparent;
                title.Location = new Point(38, 58);
                form.Controls.Add(title);

                Label intro = new Label();
                intro.Text = GameIntro;
                intro.ForeColor = textMuted;
                intro.Font = new Font("Segoe UI", 11f, FontStyle.Regular);
                intro.AutoSize = false;
                intro.Size = new Size(470, 88);
                intro.BackColor = Color.Transparent;
                intro.Location = new Point(42, 138);
                form.Controls.Add(intro);

                Panel featureCard = CreateCard(new Rectangle(40, 246, 356, 210), backgroundDeep, accent);
                form.Controls.Add(featureCard);

                Label featureHeader = CreateCardHeader("Run Highlights", accent);
                featureCard.Controls.Add(featureHeader);

                featureCard.Controls.Add(CreateBulletLabel(FeatureOne, textPrimary, new Point(18, 56)));
                featureCard.Controls.Add(CreateBulletLabel(FeatureTwo, textPrimary, new Point(18, 96)));
                featureCard.Controls.Add(CreateBulletLabel(FeatureThree, textPrimary, new Point(18, 136)));

                Panel controlCard = CreateCard(new Rectangle(430, 96, 420, 262), backgroundDeep, accent);
                form.Controls.Add(controlCard);

                Label controlHeader = CreateCardHeader("Controls", accent);
                controlCard.Controls.Add(controlHeader);
                controlCard.Controls.Add(CreateControlChip(ControlOne, textPrimary, new Point(18, 56), accent));
                controlCard.Controls.Add(CreateControlChip(ControlTwo, textPrimary, new Point(18, 112), accent));
                controlCard.Controls.Add(CreateControlChip(ControlThree, textPrimary, new Point(18, 168), accent));

                Panel footerCard = CreateCard(new Rectangle(430, 378, 420, 78), backgroundDeep, accent);
                form.Controls.Add(footerCard);

                Label footer = new Label();
                footer.Text = FooterText;
                footer.ForeColor = textMuted;
                footer.Font = new Font("Segoe UI", 10f, FontStyle.Regular);
                footer.AutoSize = false;
                footer.Size = new Size(380, 38);
                footer.BackColor = Color.Transparent;
                footer.Location = new Point(18, 20);
                footer.TextAlign = ContentAlignment.MiddleLeft;
                footerCard.Controls.Add(footer);

                Button startButton = new Button();
                startButton.Text = StartLabel;
                startButton.FlatStyle = FlatStyle.Flat;
                startButton.FlatAppearance.BorderSize = 0;
                startButton.BackColor = accent;
                startButton.ForeColor = Color.FromArgb(12, 18, 28);
                startButton.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
                startButton.Size = new Size(172, 42);
                startButton.Location = new Point(40, 480);
                startButton.Click += (sender, args) =>
                {
                    form.DialogResult = DialogResult.OK;
                    form.Close();
                };
                form.Controls.Add(startButton);

                Label actionHint = new Label();
                actionHint.Text = "Enter launches the build. Escape closes this screen.";
                actionHint.ForeColor = textMuted;
                actionHint.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
                actionHint.AutoSize = true;
                actionHint.BackColor = Color.Transparent;
                actionHint.Location = new Point(228, 490);
                form.Controls.Add(actionHint);

                form.KeyDown += (sender, args) =>
                {
                    if (args.KeyCode == Keys.Enter)
                    {
                        form.DialogResult = DialogResult.OK;
                        form.Close();
                    }
                    else if (args.KeyCode == Keys.Escape)
                    {
                        form.DialogResult = DialogResult.Cancel;
                        form.Close();
                    }
                };

                return form.ShowDialog() == DialogResult.OK;
            }
        }

        private static Panel CreateCard(Rectangle bounds, Color background, Color accent)
        {
            Panel panel = new Panel();
            panel.Bounds = bounds;
            panel.BackColor = background;

            panel.Paint += (sender, args) =>
            {
                using (Pen border = new Pen(Color.FromArgb(84, accent), 1f))
                using (Pen glow = new Pen(Color.FromArgb(34, accent), 3f))
                {
                    args.Graphics.DrawRectangle(glow, 1, 1, panel.Width - 3, panel.Height - 3);
                    args.Graphics.DrawRectangle(border, 0, 0, panel.Width - 1, panel.Height - 1);
                }
            };

            return panel;
        }

        private static Label CreateCardHeader(string text, Color accent)
        {
            Label label = new Label();
            label.Text = text;
            label.ForeColor = accent;
            label.Font = new Font("Consolas", 12f, FontStyle.Bold);
            label.AutoSize = true;
            label.BackColor = Color.Transparent;
            label.Location = new Point(18, 18);
            return label;
        }

        private static Label CreateBulletLabel(string text, Color color, Point location)
        {
            Label label = new Label();
            label.Text = "- " + text;
            label.ForeColor = color;
            label.Font = new Font("Segoe UI", 10.5f, FontStyle.Regular);
            label.AutoSize = false;
            label.Size = new Size(318, 32);
            label.BackColor = Color.Transparent;
            label.Location = location;
            return label;
        }

        private static Label CreateControlChip(string text, Color textColor, Point location, Color accent)
        {
            Label label = new Label();
            label.Text = text;
            label.ForeColor = textColor;
            label.Font = new Font("Segoe UI", 10f, FontStyle.Bold);
            label.AutoSize = false;
            label.Size = new Size(380, 38);
            label.BackColor = Color.FromArgb(18, 23, 35);
            label.Location = location;
            label.TextAlign = ContentAlignment.MiddleLeft;
            label.Padding = new Padding(14, 0, 0, 0);

            label.Paint += (sender, args) =>
            {
                using (Pen border = new Pen(Color.FromArgb(64, accent), 1f))
                {
                    args.Graphics.DrawRectangle(border, 0, 0, label.Width - 1, label.Height - 1);
                }
            };

            return label;
        }
    }

    internal sealed class LinearGradientBrushEx : IDisposable
    {
        public System.Drawing.Drawing2D.LinearGradientBrush Brush { get; private set; }

        public LinearGradientBrushEx(Rectangle bounds, Color top, Color bottom)
        {
            Brush = new System.Drawing.Drawing2D.LinearGradientBrush(
                bounds,
                top,
                bottom,
                System.Drawing.Drawing2D.LinearGradientMode.ForwardDiagonal
            );
        }

        public void Dispose()
        {
            if (Brush != null)
            {
                Brush.Dispose();
                Brush = null;
            }
        }
    }
}
