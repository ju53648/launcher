using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace EchoProtocol
{
    // ====== NEW FEATURE: CLUE COMBINATION SYSTEM ======
    public class ClueCombo
    {
        public string Id;
        public string[] RequiredClues;
        public string RevealedScene;
        public string ResultText;
        public Effect[] Effects;
    }

    // ====== NEW FEATURE: TIME MANAGEMENT ======
    public class ShiftClock
    {
        public int StartHour = 2;
        public int StartMinute = 13;
        public int TotalMinutes = 720; // 12 hours
        public int ElapsedMinutes = 0;

        public string GetTimeDisplay()
        {
            int mins = (StartMinute + ElapsedMinutes) % 60;
            int hours = StartHour + (StartMinute + ElapsedMinutes) / 60;
            return $"{hours:D2}:{mins:D2}";
        }

        public int GetTimeRemaining() => TotalMinutes - ElapsedMinutes;
        public float GetTimePercentage() => (float)ElapsedMinutes / TotalMinutes;
        public bool IsTimeUp() => ElapsedMinutes >= TotalMinutes;
    }

    // ====== NEW FEATURE: CONSEQUENCE PREVIEW ======
    public class ChoiceConsequence
    {
        public int ShiftDelta;
        public int StressDelta;
        public int TrustDelta;
        public string WarningText;
        public string OpportunitiesText;
    }

    // ====== NEW FEATURE: MESSAGE SYSTEM ======
    public class IncomingMessage
    {
        public enum MessageType { Text, Radio, SystemAlert, MiraSignal }
        public MessageType Type;
        public string Sender;
        public string Content;
        public int Priority;
        public DateTime ReceivedAt;
        public bool IsRead;
    }

    // ====== ENHANCED CHOICE WITH CONSEQUENCES ======
    public class ChoiceEnhanced : Choice
    {
        public string ConsequenceText;
        public int TimeRequired = 1;
        public string[] LinkedClues; // Clues that become available after this choice
        public string CombinationTrigger; // If two clues are combined, what happens?
    }

    // ====== NEW FEATURE: ACHIEVEMENT SYSTEM ======
    public class Achievement
    {
        public string Id;
        public string Title;
        public string Description;
        public int RewardScore;
        public bool IsUnlocked;
        public string UnlockCondition;
    }

    // ====== NEW FEATURE: RANK SYSTEM ======
    public enum InvestigatorRank
    {
        Cadet = 0,
        Officer = 1,
        Detective = 2,
        Senior = 3,
        Expert = 4,
        Master = 5,
        Architect = 6
    }

    public class RankProgress
    {
        public InvestigatorRank CurrentRank = InvestigatorRank.Officer;
        public int PointsToNextRank = 500;
        public int CurrentPoints = 0;

        public void AddPoints(int points)
        {
            CurrentPoints += points;
            if (CurrentPoints >= PointsToNextRank && CurrentRank < InvestigatorRank.Architect)
            {
                CurrentRank++;
                CurrentPoints = 0;
                PointsToNextRank = (int)(PointsToNextRank * 1.3f);
            }
        }

        public string GetRankTitle()
        {
            return CurrentRank switch
            {
                InvestigatorRank.Cadet => "CADET",
                InvestigatorRank.Officer => "OFFICER",
                InvestigatorRank.Detective => "DETECTIVE",
                InvestigatorRank.Senior => "SENIOR INVESTIGATOR",
                InvestigatorRank.Expert => "EXPERT",
                InvestigatorRank.Master => "MASTER",
                InvestigatorRank.Architect => "ARCHITECT",
                _ => "UNKNOWN"
            };
        }
    }

    // ====== NEW FEATURE: FAST NAVIGATION BUTTONS ======
    public class FastNavigationPanel : Panel
    {
        public event EventHandler<string> JumpToScene;
        private List<(string SceneId, string Label)> _quickNav = new();

        public FastNavigationPanel()
        {
            DoubleBuffered = true;
            BackColor = Color.Transparent;
            Height = 46;
        }

        public void AddQuickJump(string sceneId, string label)
        {
            if (!_quickNav.Any(x => x.SceneId == sceneId))
                _quickNav.Add((sceneId, label));

            CreateButtons();
        }

        private void CreateButtons()
        {
            Controls.Clear();
            int x = 8;
            foreach (var (sceneId, label) in _quickNav.Take(6))
            {
                Button btn = new Button
                {
                    Text = label.Substring(0, Math.Min(12, label.Length)),
                    Width = 80,
                    Height = 32,
                    Location = new Point(x, 8),
                    FlatStyle = FlatStyle.Flat,
                    BackColor = Color.FromArgb(18, 26, 42),
                    ForeColor = Color.FromArgb(200, 220, 255),
                    Font = new Font("Segoe UI", 8f, FontStyle.Bold)
                };
                btn.Click += (s, e) => JumpToScene?.Invoke(this, sceneId);
                Controls.Add(btn);
                x += 88;
            }
        }
    }

    // ====== NEW FEATURE: CONSEQUENCE TOOLTIP ======
    public class ConsequenceTooltip : Control
    {
        public ChoiceConsequence Consequence { get; set; }
        private Timer _hideTimer = new Timer();

        public ConsequenceTooltip()
        {
            DoubleBuffered = true;
            BackColor = Color.FromArgb(8, 12, 21);
            Width = 280;
            Height = 120;
            _hideTimer.Tick += (s, e) => { Visible = false; _hideTimer.Stop(); };
        }

        public void ShowAt(Point location, ChoiceConsequence consequence)
        {
            Consequence = consequence;
            Location = location;
            Visible = true;
            _hideTimer.Interval = 8000; // 8 seconds
            _hideTimer.Start();
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            if (Consequence == null) return;

            using (var bg = new SolidBrush(Color.FromArgb(18, 24, 40)))
            using (var border = new Pen(Color.FromArgb(150, 245, 94, 112), 2f))
            {
                e.Graphics.FillRectangle(bg, ClientRectangle);
                e.Graphics.DrawRectangle(border, 0, 0, Width - 1, Height - 1);
            }

            string text = $"⚠ CONSEQUENCES\n";
            if (Consequence.ShiftDelta > 0) text += $"Reality Shift: +{Consequence.ShiftDelta}\n";
            if (Consequence.StressDelta > 0) text += $"Stress: +{Consequence.StressDelta}\n";
            if (Consequence.TrustDelta < 0) text += $"Jonas Trust: {Consequence.TrustDelta}\n";
            text += $"\n{Consequence.WarningText}";

            TextRenderer.DrawText(e.Graphics, text, Font, new Rectangle(8, 8, Width - 16, Height - 16),
                Color.FromArgb(255, 180, 200), TextFormatFlags.WordBreak | TextFormatFlags.Left | TextFormatFlags.Top);
        }
    }

    // ====== NEW FEATURE: MESSAGE NOTIFICATION ======
    public class MessageNotification : Form
    {
        public MessageNotification(IncomingMessage msg)
        {
            FormBorderStyle = FormBorderStyle.None;
            BackColor = Color.FromArgb(8, 12, 21);
            Width = 320;
            Height = 80;
            StartPosition = FormStartPosition.Manual;
            Location = new Point(Screen.PrimaryScreen.WorkingArea.Width - 340, 20);
            TopMost = true;
            ShowInTaskbar = false;

            Panel msgPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.FromArgb(18, 26, 45),
                Margin = new Padding(4)
            };

            Label senderLabel = new Label
            {
                Text = $"[{msg.Type}] {msg.Sender}",
                ForeColor = msg.Type == IncomingMessage.MessageType.MiraSignal ? Color.FromArgb(255, 100, 150) : Color.FromArgb(100, 200, 255),
                Font = new Font("Segoe UI Semibold", 9f, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(12, 8)
            };

            Label contentLabel = new Label
            {
                Text = msg.Content.Length > 60 ? msg.Content.Substring(0, 60) + "..." : msg.Content,
                ForeColor = Color.FromArgb(220, 230, 255),
                Font = new Font("Segoe UI", 9f),
                AutoSize = true,
                Location = new Point(12, 30),
                MaximumSize = new Size(300, 40)
            };

            msgPanel.Controls.Add(senderLabel);
            msgPanel.Controls.Add(contentLabel);
            Controls.Add(msgPanel);

            Timer closeTimer = new Timer { Interval = 5000 };
            closeTimer.Tick += (s, e) => { closeTimer.Stop(); Close(); };
            closeTimer.Start();
        }
    }

    // ====== MAIN ENHANCED FORM ======
    public class EchoFormEnhanced : Form
    {
        private ShiftClock _clock = new ShiftClock();
        private RankProgress _rankProgress = new RankProgress();
        private List<ClueCombo> _clueCombos = new List<ClueCombo>();
        private List<Achievement> _achievements = new List<Achievement>();
        private List<IncomingMessage> _messages = new List<IncomingMessage>();
        private Dictionary<string, bool> _unlockedClues = new Dictionary<string, bool>();
        private FastNavigationPanel _fastNav;
        private ConsequenceTooltip _tooltip;
        private Label _timeDisplay;
        private Label _rankDisplay;
        private Label _messageIndicator;

        public EchoFormEnhanced()
        {
            Text = "Echo Protocol // Atmosphere Build 0.7 ENHANCED";
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(1920, 1080);
            MinimumSize = new Size(1360, 860);
            WindowState = FormWindowState.Maximized;
            BackColor = Color.FromArgb(3, 6, 11);

            BuildEnhancedUI();
            InitializeEnhancements();
        }

        private void BuildEnhancedUI()
        {
            // TIME DISPLAY (oben rechts)
            _timeDisplay = new Label
            {
                Text = "02:13 / 720MIN",
                ForeColor = Color.FromArgb(150, 200, 255),
                Font = new Font("Consolas", 12f, FontStyle.Bold),
                AutoSize = true,
                Anchor = AnchorStyles.Top | AnchorStyles.Right,
                Location = new Point(Width - 220, 20)
            };
            Controls.Add(_timeDisplay);

            // RANK DISPLAY
            _rankDisplay = new Label
            {
                Text = "OFFICER • 0/500 PTS",
                ForeColor = Color.FromArgb(200, 220, 245),
                Font = new Font("Segoe UI", 10f, FontStyle.Bold),
                AutoSize = true,
                Anchor = AnchorStyles.Top | AnchorStyles.Right,
                Location = new Point(Width - 220, 48)
            };
            Controls.Add(_rankDisplay);

            // MESSAGE INDICATOR
            _messageIndicator = new Label
            {
                Text = "📨 0 NEW",
                ForeColor = Color.FromArgb(255, 150, 180),
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                AutoSize = true,
                Anchor = AnchorStyles.Top | AnchorStyles.Right,
                Location = new Point(Width - 220, 76),
                Cursor = Cursors.Hand
            };
            _messageIndicator.Click += (s, e) => ShowMessages();
            Controls.Add(_messageIndicator);

            // FAST NAVIGATION
            _fastNav = new FastNavigationPanel
            {
                Location = new Point(24, Height - 120),
                Width = Width - 48,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
            };
            _fastNav.JumpToScene += (s, sceneId) => { /* Navigate to scene */ };
            Controls.Add(_fastNav);

            // CONSEQUENCE TOOLTIP
            _tooltip = new ConsequenceTooltip();
            Controls.Add(_tooltip);
        }

        private void InitializeEnhancements()
        {
            // ACHIEVEMENTS
            _achievements.Add(new Achievement
            {
                Id = "firstChoice",
                Title = "First Step",
                Description = "Make your first decision",
                RewardScore = 10,
                UnlockCondition = "decisions >= 1"
            });

            _achievements.Add(new Achievement
            {
                Id = "timeExplorer",
                Title = "Against the Clock",
                Description = "Complete a shift in under 300 minutes",
                RewardScore = 50,
                UnlockCondition = "time_used <= 300"
            });

            _achievements.Add(new Achievement
            {
                Id = "clueMaster",
                Title = "Pattern Seeker",
                Description = "Combine 3 clues successfully",
                RewardScore = 75,
                UnlockCondition = "combos_found >= 3"
            });

            // CLUE COMBINATIONS (New Feature)
            _clueCombos.Add(new ClueCombo
            {
                Id = "photoAndFiber",
                RequiredClues = new[] { "photo #12", "Faserprofil" },
                RevealedScene = "harbor",
                ResultText = "Das Foto und die Faser zeigen dieselbe Person am Hafen!",
                Effects = new[] { new Effect { Type = "insight", IntValue = 2 } }
            });

            _clueCombos.Add(new ClueCombo
            {
                Id = "bandAndMirror",
                RequiredClues = new[] { "Band 08", "Spiegeltext" },
                RevealedScene = "blindchamber",
                ResultText = "Das Band und der Spiegeltext ergeben eine Botschaft: Mira war nicht allein.",
                Effects = new[] { new Effect { Type = "shift", IntValue = 1 } }
            });

            // MESSAGES (New Feature)
            AddMessage(new IncomingMessage
            {
                Type = IncomingMessage.MessageType.Radio,
                Sender = "Dispatch",
                Content = "Elias, call when clear. Over.",
                Priority = 2,
                ReceivedAt = DateTime.Now
            });

            AddMessage(new IncomingMessage
            {
                Type = IncomingMessage.MessageType.Text,
                Sender = "Jonas",
                Content = "Found new lead in archive. Check sector 3.",
                Priority = 3,
                ReceivedAt = DateTime.Now
            });

            // Start clock
            Timer clockTimer = new Timer { Interval = 5000 }; // 5 sec game = 1 game minute
            clockTimer.Tick += (s, e) => UpdateClock();
            clockTimer.Start();
        }

        private void UpdateClock()
        {
            _clock.ElapsedMinutes++;
            _timeDisplay.Text = $"{_clock.GetTimeDisplay()} / {_clock.GetTimeRemaining()}MIN";

            if (_clock.IsTimeUp())
            {
                MessageBox.Show("Time's up! Shift ended.", "Clock Out");
                // Trigger ending
            }

            if (_clock.GetTimeRemaining() < 60)
            {
                _timeDisplay.ForeColor = Color.FromArgb(255, 100, 100);
            }
        }

        private void AddMessage(IncomingMessage msg)
        {
            _messages.Add(msg);
            _messageIndicator.Text = $"📨 {_messages.Count(m => !m.IsRead)} NEW";

            // Show notification
            MessageNotification notification = new MessageNotification(msg);
            notification.Show();
        }

        private void ShowMessages()
        {
            // Open message panel
            // TODO: Implement message panel UI
        }

        public void CheckClueCombo(string clueId)
        {
            // Check if this clue unlocks a combination
            var combo = _clueCombos.FirstOrDefault(c => c.RequiredClues.Contains(clueId));
            if (combo != null && combo.RequiredClues.All(c => _unlockedClues.ContainsKey(c)))
            {
                // All clues in combo are found
                // Reward player and unlock new scene
                _rankProgress.AddPoints(combo.Effects[0].IntValue * 10);
                AddMessage(new IncomingMessage
                {
                    Type = IncomingMessage.MessageType.SystemAlert,
                    Sender = "System",
                    Content = $"CLUE COMBO UNLOCKED: {combo.Id}",
                    Priority = 1
                });
            }
        }

        private void ShowConsequencePreview(ChoiceConsequence consequence, Point location)
        {
            _tooltip.ShowAt(location, consequence);
        }
    }
}
